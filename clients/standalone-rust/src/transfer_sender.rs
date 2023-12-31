use bitcoin::{Transaction, Address, secp256k1, hashes::sha256, Txid};
use mercury_lib::transfer::sender::{TransferSenderRequestPayload, TransferSenderResponsePayload, TransferUpdateMsgRequestPayload};
use secp256k1_zkp::{PublicKey, SecretKey, Secp256k1, Message, musig::{MusigPubNonce, BlindingFactor}, schnorr::Signature, Scalar};
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::{error::CError, key_derivation, client_config::ClientConfig};

// Step 7. Owner 1 then concatinates the Tx0 outpoint with the Owner 2 public key (O2) and signs it with their key o1 to generate SC_sig_1.
fn create_transfer_signature(new_user_pubkey: PublicKey, input_txid: &Txid, input_vout: u32, client_seckey: &SecretKey) -> Signature {

    let secp = Secp256k1::new();
    let keypair = secp256k1::KeyPair::from_seckey_slice(&secp, client_seckey.as_ref()).unwrap();

    let mut data_to_sign = Vec::<u8>::new();
    data_to_sign.extend_from_slice(&input_txid[..]);
    data_to_sign.extend_from_slice(&input_vout.to_le_bytes());
    data_to_sign.extend_from_slice(&new_user_pubkey.serialize()[..]);

    let msg = Message::from_hashed_data::<sha256::Hash>(&data_to_sign);
    let signature = secp.sign_schnorr(&msg, &keypair);

    signature
}

async fn get_new_x1(client_config: &ClientConfig,  statechain_id: &str, signed_statechain_id: &Signature, new_auth_pubkey: &PublicKey) -> Result<Vec<u8>, CError> {
    
    let endpoint = client_config.statechain_entity.clone();
    let path = "transfer/sender";

    let tor_proxy = client_config.tor_proxy.clone();

    let mut client: reqwest::Client = reqwest::Client::new();
    if tor_proxy != "".to_string() {
        let tor_proxy = reqwest::Proxy::all(tor_proxy).unwrap();
        client = reqwest::Client::builder().proxy(tor_proxy).build().unwrap();
    }
    let request = client.post(&format!("{}/{}", endpoint, path));

    let transfer_sender_request_payload = TransferSenderRequestPayload {
        statechain_id: statechain_id.to_string(),
        auth_sig: signed_statechain_id.to_string(),
        new_user_auth_key: new_auth_pubkey.to_string(),
        batch_id: None,
    };

    let value = match request.json(&transfer_sender_request_payload).send().await {
        Ok(response) => {

            let status = response.status();
            let text = response.text().await.unwrap_or("Unexpected error".to_string());

            if status.is_success() {
                text
            } else {
                return Err(CError::Generic(format!("status: {}, error: {}", status, text)));
            }
        },
        Err(err) => {
            return Err(CError::Generic(format!("status: {}, error: {}", err.status().unwrap(),err.to_string())));
        },
    };

    let response: TransferSenderResponsePayload = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));

    let x1 = hex::decode(response.x1).unwrap();

    Ok(x1)
}

pub async fn save_new_backup_transaction(client_config: &ClientConfig, backup_transaction: &mercury_lib::transfer::SenderBackupTransaction) {

    let tx_n = backup_transaction.tx_n; 
    let tx_bytes = bitcoin::consensus::encode::serialize(&backup_transaction.tx);
    let client_pub_nonce: [u8; 66] = backup_transaction.client_public_nonce.clone().try_into().unwrap();
    let server_pub_nonce: [u8; 66] = backup_transaction.server_public_nonce.clone().try_into().unwrap();
    let client_pubkey = &backup_transaction.client_public_key;
    let server_pubkey = &backup_transaction.server_public_key;
    let blinding_factor: [u8; 32] = backup_transaction.blinding_factor.clone().try_into().unwrap();
    let statechain_id = &backup_transaction.statechain_id;
    let recipient_address = &backup_transaction.recipient_address;

    client_config.insert_transaction(tx_n, &tx_bytes, &client_pub_nonce, &server_pub_nonce, client_pubkey, server_pubkey, &blinding_factor, &statechain_id, recipient_address).await.unwrap();
}

pub async fn init(client_config: &ClientConfig, recipient_address: &str, statechain_id: &str) -> Result<(), CError>{

    let (_, recipient_user_pubkey, recipient_auth_pubkey) = key_derivation::decode_transfer_address(recipient_address).unwrap();

    let mut backup_transactions = client_config.get_backup_transactions(&statechain_id).await;

    if backup_transactions.len() == 0 {
        return Err(CError::Generic("No backup transactions found".to_string()));
    }   

    backup_transactions.sort_by(|a, b| a.tx_n.cmp(&b.tx_n));

    let tx1 = &backup_transactions[0];

    let (client_seckey, 
        client_public_key, 
        server_public_key,
        input_txid, 
        input_vout, 
        transaction, 
        client_pub_nonce, 
        server_pub_nonce,
        blinding_factor, 
        signed_statechain_id) = 
    create_backup_tx_to_receiver(&client_config, &tx1.tx, recipient_user_pubkey, &statechain_id).await;

    let x1 = get_new_x1(client_config, &statechain_id, &signed_statechain_id, &recipient_auth_pubkey).await;

    let new_tx_n = backup_transactions.last().unwrap().tx_n + 1;

    let new_bakup_tx = mercury_lib::transfer::SenderBackupTransaction {
        statechain_id: statechain_id.to_string(),
        tx_n: new_tx_n,
        tx: transaction,
        client_public_nonce: client_pub_nonce.serialize().to_vec(),
        server_public_nonce: server_pub_nonce.serialize().to_vec(),
        client_public_key,
        server_public_key,
        blinding_factor: blinding_factor.as_bytes().to_vec(),
        recipient_address: recipient_address.to_string(),
    };

    backup_transactions.push(new_bakup_tx.clone());

    let mut serialized_backup_transactions = Vec::<mercury_lib::transfer::SerializedBackupTransaction>::new();

    for backup_tx in backup_transactions {
        serialized_backup_transactions.push(backup_tx.serialize());
    }

    let transfer_signature = create_transfer_signature(recipient_user_pubkey, &input_txid, input_vout, &client_seckey);

    let x1: [u8; 32] = x1?.try_into().unwrap();
    let x1 = Scalar::from_be_bytes(x1).unwrap();

    let t1 = client_seckey.add_tweak(&x1).unwrap();

    let transfer_msg = mercury_lib::transfer::TransferMsg1 {
        statechain_id: statechain_id.to_string(),
        transfer_signature: transfer_signature.to_string(),
        backup_transactions: serialized_backup_transactions,
        t1: t1.secret_bytes(),
        user_public_key: client_public_key.to_string(),
    };

    let transfer_msg_json = json!(&transfer_msg);

    let transfer_msg_json_str = serde_json::to_string_pretty(&transfer_msg_json).unwrap();

    let msg = transfer_msg_json_str.as_bytes();

    let serialized_new_auth_pubkey = &recipient_auth_pubkey.serialize();
    let encrypted_msg = ecies::encrypt(serialized_new_auth_pubkey, msg).unwrap();

    let encrypted_msg_string = hex::encode(&encrypted_msg);

    let transfer_update_msg_request_payload = TransferUpdateMsgRequestPayload {
        statechain_id: statechain_id.to_string(),
        auth_sig: signed_statechain_id.to_string(),
        new_user_auth_key: recipient_auth_pubkey.to_string(),
        enc_transfer_msg: encrypted_msg_string.clone(),
    };

    let endpoint = client_config.statechain_entity.clone();
    let path = "transfer/update_msg";

    let tor_proxy = client_config.tor_proxy.clone();

    let mut client: reqwest::Client = reqwest::Client::new();
    if tor_proxy != "".to_string() {
        let tor_proxy = reqwest::Proxy::all(tor_proxy).unwrap();
        client = reqwest::Client::builder().proxy(tor_proxy).build().unwrap();
    }
    let request = client.post(&format!("{}/{}", endpoint, path));

    match request.json(&transfer_update_msg_request_payload).send().await {
        Ok(response) => {
            let status = response.status();
            if !status.is_success() {
                return Err(CError::Generic("Failed to update transfer message".to_string()));
            }
        },
        Err(err) => 
            return Err(CError::Generic(err.to_string()))
        ,
    };

    // Now it is sucessfully sent to the server, we can save it to the database
    save_new_backup_transaction(client_config, &new_bakup_tx).await;

    client_config.update_coin_status_and_tx_withdraw(statechain_id, "SPENT", None).await;

    Ok(()) 
}

pub async fn create_backup_tx_to_receiver(client_config: &ClientConfig, tx1: &Transaction, new_user_pubkey: PublicKey, statechain_id: &str) 
    -> (SecretKey, PublicKey, PublicKey, Txid, u32, Transaction, MusigPubNonce, MusigPubNonce, BlindingFactor, Signature) {

    let lock_time = tx1.lock_time;
    assert!(lock_time.is_block_height());
    let block_height = lock_time.to_consensus_u32();

    assert!(tx1.input.len() == 1);
    let input = &tx1.input[0];
    
    let statechain_coin_details = client_config.get_statechain_coin_details(&statechain_id).await;

    let auth_secret_key = statechain_coin_details.auth_seckey;

    let secp = Secp256k1::new();
    let keypair = secp256k1::KeyPair::from_seckey_slice(&secp, auth_secret_key.as_ref()).unwrap();
    let msg = Message::from_hashed_data::<sha256::Hash>(statechain_id.to_string().as_bytes());
    let signed_statechain_id = secp.sign_schnorr(&msg, &keypair);

    let client_seckey = statechain_coin_details.client_seckey;
    let client_pubkey = statechain_coin_details.client_pubkey;
    let server_pubkey = statechain_coin_details.server_pubkey;
    let input_txid = input.previous_output.txid;
    let input_vout = input.previous_output.vout;
    let input_pubkey = statechain_coin_details.aggregated_pubkey;
    let input_scriptpubkey = statechain_coin_details.p2tr_agg_address.script_pubkey();
    let input_amount = statechain_coin_details.amount;

    let to_address = Address::p2tr(&Secp256k1::new(), new_user_pubkey.x_only_public_key().0, None, client_config.network);

    let (new_tx, client_pub_nonce, server_pub_nonce, blinding_factor) = crate::transaction::new_backup_transaction(
        client_config, 
        block_height,
        statechain_id,
        &signed_statechain_id,
        &client_seckey,
        &client_pubkey,
        &server_pubkey,
        input_txid, 
        input_vout, 
        &input_pubkey, 
        &input_scriptpubkey, 
        input_amount, 
        &to_address,
        false,).await.unwrap();

    (client_seckey, client_pubkey, server_pubkey, input_txid, input_vout, new_tx, client_pub_nonce, server_pub_nonce, blinding_factor, signed_statechain_id)

}