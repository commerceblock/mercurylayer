use std::str::FromStr;

use bitcoin::{Transaction, secp256k1::PublicKey};
use secp256k1_zkp::musig::{MusigPubNonce, BlindingFactor};
use serde::{Deserialize, Serialize};

pub mod receiver;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SenderBackupTransaction {
    pub statechain_id: String,
    pub tx_n: u32,
    pub tx: Transaction,
    pub client_public_nonce: Vec<u8>,
    pub server_public_nonce: Vec<u8>,
    pub client_public_key: PublicKey,
    pub server_public_key: PublicKey,
    pub blinding_factor: Vec<u8>,
    pub recipient_address: String,
}

/// This struct is similar to `SenderBackupTransaction`
/// but it is after the deserialization process because
/// `MusigPubNonce` amd `BlindingFactor` do not support
/// `Serialize` and `Deserialize` traits.
pub struct ReceiverBackupTransaction {
    pub statechain_id: String,
    pub tx_n: u32,
    pub tx: Transaction,
    pub client_public_nonce: MusigPubNonce,
    pub server_public_nonce: MusigPubNonce,
    pub client_public_key: PublicKey,
    pub server_public_key: PublicKey,
    pub blinding_factor: BlindingFactor,
    pub recipient_address: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SerializedBackupTransaction {
    pub tx_n: u32,
    pub  tx: String,
    pub client_public_nonce: String,
    pub server_public_nonce: String,
    pub client_public_key: String,
    pub server_public_key: String,
    pub blinding_factor: String,
    pub recipient_address: String,
}

impl SenderBackupTransaction {
    pub fn serialize(&self) -> SerializedBackupTransaction {
        SerializedBackupTransaction {
            tx_n: self.tx_n,
            tx: hex::encode(&bitcoin::consensus::encode::serialize(&self.tx)),
            client_public_nonce: hex::encode(&self.client_public_nonce),
            server_public_nonce: hex::encode(&self.server_public_nonce),
            client_public_key: self.client_public_key.to_string(),
            server_public_key: self.server_public_key.to_string(),
            blinding_factor: hex::encode(&self.blinding_factor),
            recipient_address: self.recipient_address.clone(),
        }
    }
}

impl SerializedBackupTransaction {
    pub fn deserialize(&self) -> ReceiverBackupTransaction {
        ReceiverBackupTransaction {
            statechain_id: "".to_string(),
            tx_n: self.tx_n,
            tx: bitcoin::consensus::encode::deserialize(&hex::decode(&self.tx).unwrap()).unwrap(),
            client_public_nonce: MusigPubNonce::from_slice(hex::decode(&self.client_public_nonce).unwrap().as_slice()).unwrap(),
            server_public_nonce: MusigPubNonce::from_slice(hex::decode(&self.server_public_nonce).unwrap().as_slice()).unwrap(),
            client_public_key: PublicKey::from_str(&self.client_public_key).unwrap(),
            server_public_key: PublicKey::from_str(&self.server_public_key).unwrap(),
            blinding_factor: BlindingFactor::from_slice(hex::decode(&self.blinding_factor).unwrap().as_slice()).unwrap(),
            recipient_address: self.recipient_address.clone(),
        }
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TransferMsg {
    pub statechain_id: String,
    pub transfer_signature: String,
    pub backup_transactions: Vec<SerializedBackupTransaction>,
    pub t1: [u8; 32],
}