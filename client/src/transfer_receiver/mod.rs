use bitcoin::{Transaction, Network, Address};
use secp256k1_zkp::{SecretKey, PublicKey, Secp256k1};
use serde::{Serialize, Deserialize};
use sqlx::Sqlite;

use crate::error::CError;

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

async fn process_encrypted_message(auth_key: &SecretKey, client_pubkey_share: &PublicKey, enc_messages: &Vec<String>, network: Network,) {
    for enc_message in enc_messages {

        let decoded_enc_message = hex::decode(enc_message).unwrap();

        let decrypted_msg = ecies::decrypt(auth_key.secret_bytes().as_slice(), decoded_enc_message.as_slice()).unwrap();

        let decrypted_msg_str = String::from_utf8(decrypted_msg).unwrap();

        let transfer_msg: TransferMsg = serde_json::from_str(decrypted_msg_str.as_str()).unwrap();

        println!("statechain_id: {}", transfer_msg.statechain_id);
        println!("transfer_signature: {}", transfer_msg.transfer_signature);

        verify_latest_backup_tx_pays_to_user_pubkey(&transfer_msg, client_pubkey_share, network).await;
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