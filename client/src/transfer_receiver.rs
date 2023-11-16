use std::str::FromStr;

use bitcoin::{Transaction, Network, Address, Txid, sighash::{SighashCache, TapSighashType, self}, TxOut, taproot::TapTweakHash, hashes::{Hash, sha256}, secp256k1};
use mercury_lib::transfer::receiver::{GetMsgAddrResponsePayload, StatechainInfoResponsePayload, StatechainInfo};
use secp256k1_zkp::{SecretKey, PublicKey, Secp256k1, schnorr::Signature, XOnlyPublicKey, Message, musig::{MusigAggNonce,  MusigSession,  blinded_musig_pubkey_xonly_tweak_add}, Scalar};
use serde::{Serialize, Deserialize};
use serde_json::Value;

use crate::{error::CError, electrum, utils::InfoConfig, client_config::ClientConfig};

async fn get_msg_addr(auth_pubkey: &secp256k1_zkp::PublicKey, statechain_entity_url: &str) -> Result<Vec<String>, CError> {
    let endpoint = statechain_entity_url;
    let path = format!("transfer/get_msg_addr/{}", auth_pubkey.to_string());

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.get(&format!("{}/{}", endpoint, path));

    let value = match request.send().await {
        Ok(response) => {
            let text = response.text().await.unwrap();
            text
        },
        Err(err) => {
            return Err(CError::Generic(err.to_string()));
        },
    };

    let response: GetMsgAddrResponsePayload = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));

    Ok(response.list_enc_transfer_msg)
}

fn validate_t1pub(t1: &[u8; 32], x1_pub: &PublicKey, sender_public_key: &PublicKey) -> bool {

    let secret_t1 = SecretKey::from_slice(t1).unwrap();
    let public_t1 = secret_t1.public_key(&Secp256k1::new());

    let result_pubkey = sender_public_key.combine(&x1_pub).unwrap();

    result_pubkey == public_t1
}

fn calculate_t2(transfer_msg: &mercury_lib::transfer::TransferMsg1, client_seckey_share: &SecretKey,) -> SecretKey {

    let t1 = Scalar::from_be_bytes(transfer_msg.t1).unwrap();

    let negated_seckey = client_seckey_share.negate();

    let t2 = negated_seckey.add_tweak(&t1).unwrap();

    t2
}

/// step 3. Owner 2 verifies that the latest backup transaction pays to their key O2 and that the input (Tx0) is unspent.
async fn verify_latest_backup_tx_pays_to_user_pubkey(transfer_msg: &mercury_lib::transfer::TransferMsg1, client_pubkey_share: &PublicKey, network: Network,) -> bool {

    let last_tx = transfer_msg.backup_transactions.last().unwrap();

    let backup_tx = last_tx.deserialize();

    let output = &backup_tx.tx.output[0];

    let aggregate_address = Address::p2tr(&Secp256k1::new(), client_pubkey_share.x_only_public_key().0, None, network);

    output.script_pubkey == aggregate_address.script_pubkey()
}

fn get_tx_hash(transaction: &Transaction, electrum_client: &electrum_client::Client) -> Message {

    let witness = transaction.input[0].witness.clone();

    let witness_data = witness.nth(0).unwrap();

    let vout = transaction.input[0].previous_output.vout as usize;

    let txid = transaction.input[0].previous_output.txid.to_string();

    let res = electrum::batch_transaction_get_raw(electrum_client, &[Txid::from_str(&txid).unwrap()]);

    let funding_tx_bytes = res[0].clone();

    let funding_tx: Transaction = bitcoin::consensus::encode::deserialize(&funding_tx_bytes).unwrap();

    let funding_tx_output = funding_tx.output[vout].clone();

    let sighash_type = TapSighashType::from_consensus_u8(witness_data.last().unwrap().to_owned()).unwrap();

    let hash = SighashCache::new(transaction).taproot_key_spend_signature_hash(
        0,
        &sighash::Prevouts::All(&[TxOut {
            value: funding_tx_output.value,
            script_pubkey: funding_tx_output.script_pubkey.clone(),
        }]),
        sighash_type,
    ).unwrap();

    let msg: Message = hash.into();

    msg
}

/// step 4a. Verifiy if the signature is valid.
async fn verify_transaction_signature(transaction: &Transaction, fee_rate_sats_per_byte: u64, client_config: &ClientConfig) -> Result<(), CError> {

    let witness = transaction.input[0].witness.clone();

    let witness_data = witness.nth(0).unwrap();

    // the last element is the hash type
    let signature_data = witness_data.split_last().unwrap().1;

    let signature = Signature::from_slice(signature_data).unwrap();

    let txid = transaction.input[0].previous_output.txid.to_string();

    let res = electrum::batch_transaction_get_raw(&client_config.electrum_client, &[Txid::from_str(&txid).unwrap()]);

    let funding_tx_bytes = res[0].clone();

    let funding_tx: Transaction = bitcoin::consensus::encode::deserialize(&funding_tx_bytes).unwrap();

    let vout = transaction.input[0].previous_output.vout as usize;

    let funding_tx_output = funding_tx.output[vout].clone();

    let res = electrum::get_script_pubkey_list_unspent(&client_config.electrum_client, &funding_tx_output.script_pubkey.as_script());

    if res.len() == 0 {
        return Err(CError::Generic("The funding UTXO is spent".to_string()));
    } 

    let xonly_pubkey = XOnlyPublicKey::from_slice(funding_tx_output.script_pubkey[2..].as_bytes()).unwrap();

    let sighash_type = TapSighashType::from_consensus_u8(witness_data.last().unwrap().to_owned()).unwrap();

    let hash = SighashCache::new(transaction).taproot_key_spend_signature_hash(
        0,
        &sighash::Prevouts::All(&[TxOut {
            value: funding_tx_output.value,
            script_pubkey: funding_tx_output.script_pubkey.clone(),
        }]),
        sighash_type,
    ).unwrap();

    let msg: Message = hash.into();

    let fee = funding_tx_output.value - transaction.output[0].value;
    let fee_rate = fee / transaction.vsize() as u64;

    if (fee_rate as i64 + client_config.fee_rate_tolerance as i64) < fee_rate_sats_per_byte as i64 {
        return Err(CError::Generic("Fee rate too low".to_string()));
    }

    if (fee_rate as i64 - client_config.fee_rate_tolerance as i64) > fee_rate_sats_per_byte as i64 {
        return Err(CError::Generic("Fee rate too high".to_string()));
    }

    if !Secp256k1::new().verify_schnorr(&signature, &msg, &xonly_pubkey).is_ok() {
        return Err(CError::Generic("Invalid signature".to_string()));
    }

    Ok(())

}

async fn get_funding_transaction_info(transaction: &Transaction, electrum_client: &electrum_client::Client) -> (XOnlyPublicKey, Txid, usize, u64) {

    let txid = transaction.input[0].previous_output.txid;

    let res = electrum::batch_transaction_get_raw(&electrum_client, &[txid]);

    let funding_tx_bytes = res[0].clone();

    let funding_tx: Transaction = bitcoin::consensus::encode::deserialize(&funding_tx_bytes).unwrap();

    let vout = transaction.input[0].previous_output.vout as usize;

    let funding_tx_output = funding_tx.output[vout].clone();

    let xonly_pubkey = XOnlyPublicKey::from_slice(funding_tx_output.script_pubkey[2..].as_bytes()).unwrap();

    (xonly_pubkey, txid, vout, funding_tx_output.value)
}

async fn verify_blinded_musig_scheme(backup_tx: &mercury_lib::transfer::ReceiverBackupTransaction, statechain_info: &StatechainInfo, electrum_client: &electrum_client::Client) -> Result<(), CError> {

    let client_public_nonce = backup_tx.client_public_nonce.clone();
    let server_public_nonce = backup_tx.server_public_nonce.clone();
    let client_public_key = backup_tx.client_public_key.clone();
    let server_public_key = backup_tx.server_public_key.clone();
    let blinding_factor = &backup_tx.blinding_factor;

    let blind_commitment = sha256::Hash::hash(blinding_factor.as_bytes());
    let r2_commitment = sha256::Hash::hash(&client_public_nonce.serialize());

    if statechain_info.blind_commitment != blind_commitment.to_string() {
        return Err(CError::Generic("blind_commitment is not correct".to_string()));
    }

    if statechain_info.r2_commitment != r2_commitment.to_string() {
        return Err(CError::Generic("r2_commitment is not correct".to_string()));
    }

    let secp = Secp256k1::new();

    // TODO: this code is repeated in client/src/transaction/mod.rs. Move it to a common place.
    let aggregate_pubkey = client_public_key.combine(&server_public_key).unwrap();

    let tap_tweak = TapTweakHash::from_key_and_tweak(aggregate_pubkey.x_only_public_key().0, None);
    let tap_tweak_bytes = tap_tweak.as_byte_array();

    let tweak = SecretKey::from_slice(tap_tweak_bytes).unwrap();

    let (_, output_pubkey, out_tweak32) = blinded_musig_pubkey_xonly_tweak_add(&secp, &aggregate_pubkey, tweak);
    
    let aggnonce = MusigAggNonce::new(&secp, &[client_public_nonce, server_public_nonce]);

    let msg = get_tx_hash(&backup_tx.tx, electrum_client);

    let session = MusigSession::new_blinded_without_key_agg_cache(
        &secp,
        &output_pubkey,
        aggnonce,
        msg,
        None,
        &blinding_factor,
        out_tweak32
    );
    // END repeated code

    let challenge = session.get_challenge_from_session();
    let challenge = hex::encode(challenge);

    if statechain_info.challenge != challenge {
        return Err(CError::Generic("challenge is not correct".to_string()));
    }

    Ok(())

}

async fn get_statechain_info(statechain_id: &str, statechain_entity_url: &str) -> Result<StatechainInfoResponsePayload, CError> {

    let endpoint = statechain_entity_url;
    let path = format!("info/statechain/{}", statechain_id.to_string());

    println!("statechain_id: {}", statechain_id.to_string());
    println!("path: {}", path);

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.get(&format!("{}/{}", endpoint, path));

    let value = match request.send().await {
        Ok(response) => {
            let text = response.text().await.unwrap();
            text
        },
        Err(err) => {
            return Err(CError::Generic(err.to_string()));
        },
    };

    let response: StatechainInfoResponsePayload = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));

    Ok(response)
}

fn verify_transfer_signature(new_user_pubkey: &PublicKey, input_txid: &Txid, input_vout: u32, signature: &Signature, sender_public_key: &XOnlyPublicKey) -> bool {

    let secp = Secp256k1::new();

    let mut data_to_verify = Vec::<u8>::new();
    data_to_verify.extend_from_slice(&input_txid[..]);
    data_to_verify.extend_from_slice(&input_vout.to_le_bytes());
    data_to_verify.extend_from_slice(&new_user_pubkey.serialize()[..]);

    let msg = Message::from_hashed_data::<sha256::Hash>(&data_to_verify);

    secp.verify_schnorr(signature, &msg, &sender_public_key).is_ok()
}

async fn process_encrypted_message(
    client_config: &ClientConfig, 
    client_auth_key: &SecretKey, 
    client_seckey_share: &SecretKey, 
    client_pubkey_share: &PublicKey, 
    enc_messages: &Vec<String>, 
    info_config: &InfoConfig) -> Result<(), CError> {

    for enc_message in enc_messages {

        let decoded_enc_message = hex::decode(enc_message).unwrap();

        let decrypted_msg = ecies::decrypt(client_auth_key.secret_bytes().as_slice(), decoded_enc_message.as_slice()).unwrap();

        let decrypted_msg_str = String::from_utf8(decrypted_msg).unwrap();

        let transfer_msg: mercury_lib::transfer::TransferMsg1 = serde_json::from_str(decrypted_msg_str.as_str()).unwrap();

        let statechain_info = get_statechain_info(&transfer_msg.statechain_id, &client_config.statechain_entity).await.unwrap();

        let backup_transaction = transfer_msg.backup_transactions.first().unwrap();

        let backup_transaction = backup_transaction.deserialize(); 

        let (funding_xonly_pubkey, txid, vout, amount) = get_funding_transaction_info(&backup_transaction.tx, &client_config.electrum_client).await;

        let sender_public_key = PublicKey::from_str(&transfer_msg.user_public_key).unwrap();

        let transfer_signature = Signature::from_str(&transfer_msg.transfer_signature).unwrap();

        let is_transfer_signature_valid = verify_transfer_signature(
            &client_pubkey_share, 
            &txid, 
            vout as u32, 
            &transfer_signature, 
            &sender_public_key.x_only_public_key().0
        );

        if !is_transfer_signature_valid {
            println!("Invalid transfer signature");
            continue;
        }

        // validate tranfer.pub_key + client_pub_key = funding_xonly_pubkey
        let enclave_public_key = PublicKey::from_str(&statechain_info.enclave_public_key).unwrap();

        let transfer_aggregate_pubkey = sender_public_key.combine(&enclave_public_key).unwrap();
        let transfer_aggregate_xonly_pubkey = transfer_aggregate_pubkey.x_only_public_key().0;

        let secp = Secp256k1::new();

        let transfer_aggregate_address = Address::p2tr(&secp, transfer_aggregate_xonly_pubkey, None, client_config.network);

        let transfer_aggregate_xonly_pubkey = XOnlyPublicKey::from_slice(transfer_aggregate_address.script_pubkey()[2..].as_bytes()).unwrap();
        
        if transfer_aggregate_xonly_pubkey != funding_xonly_pubkey {
            println!("Aggregated public keys do not match. This statecoin may have been updated.");
            continue;
        }

        if !verify_latest_backup_tx_pays_to_user_pubkey(&transfer_msg, client_pubkey_share, client_config.network).await {
            return Err(CError::Generic("Latest backup tx does not pay to user pubkey".to_string()));
        }

        if statechain_info.num_sigs != transfer_msg.backup_transactions.len() as u32 {
            return Err(CError::Generic("num_sigs is not correct".to_string()));
        }

        let mut previous_lock_time: Option<u32> = None;

        for (index, backup_tx) in transfer_msg.backup_transactions.iter().enumerate() {

            let statechain_info = statechain_info.statechain_info.get(index).unwrap();

            let backup_tx = backup_tx.deserialize(); 
            let is_signature_valid = verify_transaction_signature(&backup_tx.tx, info_config.fee_rate_sats_per_byte, client_config).await;
            if is_signature_valid.is_err() {
                return Err(is_signature_valid.err().unwrap());
            }

            let is_blinded_musig_scheme_valid = verify_blinded_musig_scheme(&backup_tx, statechain_info, &client_config.electrum_client).await;
            if is_blinded_musig_scheme_valid.is_err() {
                return Err(is_blinded_musig_scheme_valid.err().unwrap());
            }

            if previous_lock_time.is_some() {
                let prev_lock_time = previous_lock_time.unwrap();
                let current_lock_time = backup_tx.tx.lock_time.to_consensus_u32();
                if (prev_lock_time - current_lock_time) as i32 != info_config.interval as i32 {
                    return Err(CError::Generic("interval is not correct".to_string()));
                }
            }

            previous_lock_time = Some(backup_tx.tx.lock_time.to_consensus_u32());
        }

        let x1_pub = PublicKey::from_str(&statechain_info.x1_pub).unwrap();

        if !validate_t1pub(&transfer_msg.t1, &x1_pub, &sender_public_key) {
            return Err(CError::Generic("Invalid t1".to_string()));
        }

        let t2 = calculate_t2(&transfer_msg, &client_seckey_share);

        let t2_hex = hex::encode(t2.secret_bytes());

        
        let client_auth_keypair = secp256k1::KeyPair::from_seckey_slice(&secp, client_auth_key.as_ref()).unwrap();
        let msg = Message::from_hashed_data::<sha256::Hash>(t2_hex.as_bytes());
        let auth_sig = secp.sign_schnorr(&msg, &client_auth_keypair);

        let transfer_receiver_request_payload = mercury_lib::transfer::receiver::TransferReceiverRequestPayload {
            statechain_id: transfer_msg.statechain_id.clone(),
            batch_data: None,
            t2: t2_hex,
            auth_sig: auth_sig.to_string(),
        };

        let endpoint = client_config.statechain_entity.clone();
        let path = "transfer/receiver";

        let client = reqwest::Client::new();
        let request = client.post(&format!("{}/{}", endpoint, path));

        let value = match request.json(&transfer_receiver_request_payload).send().await {
            Ok(response) => {
                let text = response.text().await.unwrap();
                text
            },
            Err(err) => {
                return Err(CError::Generic(err.to_string()));
            },
        };

        let response: Value = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));

        let server_public_key_hex = response.get("server_pubkey").unwrap().as_str().unwrap();

        let server_pubkey_share = PublicKey::from_str(server_public_key_hex).unwrap();

        let aggregate_pubkey = client_pubkey_share.combine(&server_pubkey_share).unwrap();

        let aggregated_xonly_pubkey = aggregate_pubkey.x_only_public_key().0;

        let aggregate_address = Address::p2tr(&secp, aggregated_xonly_pubkey, None, client_config.network);

        let xonly_pubkey = XOnlyPublicKey::from_slice(aggregate_address.script_pubkey()[2..].as_bytes()).unwrap();

        if funding_xonly_pubkey != xonly_pubkey {
            return Err(CError::Generic("Aggregated public key is not correct".to_string()));
        }

        let statechain_id = transfer_msg.statechain_id.clone();

        println!("statechain_id: {}", statechain_id);

        let p2tr_agg_address = Address::p2tr(&secp, aggregated_xonly_pubkey, None, client_config.network);

        let msg = Message::from_hashed_data::<sha256::Hash>(statechain_id.to_string().as_bytes());
        let signed_statechain_id = secp.sign_schnorr(&msg, &client_auth_keypair);

        let vec_backup_transactions: Vec<mercury_lib::transfer::ReceiverBackupTransaction> = transfer_msg.backup_transactions.iter().map(|x| x.deserialize()).collect();
    
        client_config.insert_or_update_new_statechain(
            &statechain_id, 
            amount as u32,  
            &server_pubkey_share, 
            &aggregate_pubkey, 
            &p2tr_agg_address, 
            client_pubkey_share,
            &signed_statechain_id,
            &txid,
            vout as u32,
            previous_lock_time.unwrap(),
            &vec_backup_transactions).await;
    }

    Ok(())
}

pub async fn receive(client_config: &ClientConfig) {

    let info_config = crate::utils::info_config(&client_config.statechain_entity, &client_config.electrum_client).await.unwrap();

    let client_keys = client_config.get_all_auth_pubkey().await;

    for client_key in client_keys {
        let enc_messages = get_msg_addr(&client_key.1, &client_config.statechain_entity).await.unwrap();
        if enc_messages.len() == 0 {
            continue;
        }
        process_encrypted_message(
            client_config, 
            &client_key.0, 
            &client_key.2,
            &client_key.3, 
            &enc_messages, 
            &info_config, 
        ).await.unwrap();
    }
}