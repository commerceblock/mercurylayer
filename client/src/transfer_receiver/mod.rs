use std::str::FromStr;

use bitcoin::{Transaction, Network, Address, transaction, Txid, sighash::{SighashCache, TapSighashType, self}, TxOut};
use secp256k1_zkp::{SecretKey, PublicKey, Secp256k1, schnorr::Signature, XOnlyPublicKey, Message};
use serde::{Serialize, Deserialize};
use sqlx::Sqlite;

use crate::{error::CError, electrum};

mod db;

async fn get_msg_addr(auth_pubkey: &secp256k1_zkp::PublicKey) -> Result<Vec<String>, CError> {
    let endpoint = "http://127.0.0.1:8000";
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

    #[derive(Serialize, Deserialize)]
    pub struct GetMsgAddrResponsePayload {
        list_enc_transfer_msg: Vec<String>,
    }

    let response: GetMsgAddrResponsePayload = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));

    Ok(response.list_enc_transfer_msg)
}

// The structs below are repeated in client/src/transfer_sender/mod.rs
// TODO: move them to a common place 
pub struct BackupTransaction {
    statechain_id: String,
    tx_n: u32,
    tx: Transaction,
    client_public_nonce: Vec<u8>,
    blinding_factor: Vec<u8>,
    recipient_address: String,
}

#[derive(Debug, Deserialize, Serialize)]
struct SerializedBackupTransaction {
    tx_n: u32,
    tx: String,
    client_public_nonce: String,
    blinding_factor: String,
}

#[derive(Debug, Deserialize, Serialize)]
struct TransferMsg {
    statechain_id: String,
    transfer_signature: String,
    backup_transactions: Vec<SerializedBackupTransaction>,
    t1: [u8; 32],
}

impl SerializedBackupTransaction {
    fn deserialize(&self) -> BackupTransaction {
        BackupTransaction {
            statechain_id: "".to_string(),
            tx_n: self.tx_n,
            tx: bitcoin::consensus::encode::deserialize(&hex::decode(&self.tx).unwrap()).unwrap(),
            client_public_nonce: hex::decode(&self.client_public_nonce).unwrap(),
            blinding_factor: hex::decode(&self.blinding_factor).unwrap(),
            recipient_address: "".to_string(),
        }
    }
}

/// step 3. Owner 2 verifies that the latest backup transaction pays to their key O2 and that the input (Tx0) is unspent.
async fn verify_latest_backup_tx_pays_to_user_pubkey(transfer_msg: &TransferMsg, client_pubkey_share: &PublicKey, network: Network,) {

    let last_tx = transfer_msg.backup_transactions.last().unwrap();

    println!("last_tx.tx_n: {}", last_tx.tx_n);

    let backup_tx = last_tx.deserialize();

    println!("backup_tx.tx.output.len: {}", backup_tx.tx.output.len());

    let output = &backup_tx.tx.output[0];

    let x = &output.script_pubkey;

    let aggregate_address = Address::p2tr(&Secp256k1::new(), client_pubkey_share.x_only_public_key().0, None, network);

    println!("aggregate_address.script_pubkey: {}", aggregate_address.script_pubkey().to_hex_string());

    println!("x.script_pubkey: {}", x.to_hex_string());
}

/// step 4a. Verifiy if the signature is valid.
async fn verify_transaction_signature(transaction: Transaction) -> bool {

    let client = electrum_client::Client::new("tcp://127.0.0.1:50001").unwrap();

    let witness = transaction.input[0].witness.clone();

    let witness_data = witness.nth(0).unwrap();

    // the last element is the hash type
    let signature_data = witness_data.split_last().unwrap().1;

    let signature = Signature::from_slice(signature_data).unwrap();

    let txid = transaction.input[0].previous_output.txid.to_string();

    let res = electrum::batch_transaction_get_raw(&client, &[Txid::from_str(&txid).unwrap()]);

    let funding_tx_bytes = res[0].clone();

    let funding_tx: Transaction = bitcoin::consensus::encode::deserialize(&funding_tx_bytes).unwrap();

    let vout = transaction.input[0].previous_output.vout as usize;

    let funding_tx_output = funding_tx.output[vout].clone();

    let xonly_pubkey = XOnlyPublicKey::from_slice(funding_tx_output.script_pubkey[2..].as_bytes()).unwrap();

    let sighash_type = TapSighashType::from_consensus_u8(witness_data.last().unwrap().to_owned()).unwrap();

    let hash = SighashCache::new(&transaction).taproot_key_spend_signature_hash(
        0,
        &sighash::Prevouts::All(&[TxOut {
            value: funding_tx_output.value,
            script_pubkey: funding_tx_output.script_pubkey.clone(),
        }]),
        sighash_type,
    ).unwrap();

    let msg: Message = hash.into();

    Secp256k1::new().verify_schnorr(&signature, &msg, &xonly_pubkey).is_ok()

}

async fn process_encrypted_message(auth_key: &SecretKey, client_pubkey_share: &PublicKey, enc_messages: &Vec<String>, network: Network,) {
    for enc_message in enc_messages {

        let decoded_enc_message = hex::decode(enc_message).unwrap();

        let decrypted_msg = ecies::decrypt(auth_key.secret_bytes().as_slice(), decoded_enc_message.as_slice()).unwrap();

        let decrypted_msg_str = String::from_utf8(decrypted_msg).unwrap();

        let transfer_msg: TransferMsg = serde_json::from_str(decrypted_msg_str.as_str()).unwrap();

        println!("statechain_id: {}", transfer_msg.statechain_id);
        println!("transfer_signature: {}", transfer_msg.transfer_signature);

        verify_latest_backup_tx_pays_to_user_pubkey(&transfer_msg, client_pubkey_share, network).await;

        for backup_tx in transfer_msg.backup_transactions {
            let backup_tx = backup_tx.deserialize();
            let is_signature_valid = verify_transaction_signature(backup_tx.tx).await;
            println!("is_signature_valid: {}", is_signature_valid);
        }
    }
}

pub async fn receive(pool: &sqlx::Pool<Sqlite>, network: Network,) {

    let client_keys = db::get_all_auth_pubkey(pool).await;

    for client_key in client_keys {
        let enc_messages = get_msg_addr(&client_key.1).await.unwrap();
        if enc_messages.len() == 0 {
            continue;
        }
        process_encrypted_message(&client_key.0, &client_key.2, &enc_messages, network).await;
    }
}