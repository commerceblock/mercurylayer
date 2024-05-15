use std::str::FromStr;

use bitcoin::Transaction;
use serde::{Serialize, Deserialize};

use crate::{wallet::{BackupTx, Coin}, MercuryError};

#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
pub struct ServerConfig {
    pub initlock: u32,
    pub interval: u32,
}

#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
pub struct InfoConfig {
    pub initlock: u32,
    pub interval: u32,
    pub fee_rate_sats_per_byte: u64,
}

#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
pub struct PubKeyInfo {
    pub server_pubkey: String,
    pub tx_n: u32,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
pub struct KeyListResponsePayload {
    pub list_keyinfo: Vec<PubKeyInfo>,
}

pub fn get_network(network: &str) -> Result<bitcoin::Network, MercuryError> {
    match network {
        "signet" => Ok(bitcoin::Network::Signet),
        "testnet" => Ok(bitcoin::Network::Testnet),
        "regtest" => Ok(bitcoin::Network::Regtest),
        "mainnet" => Ok(bitcoin::Network::Bitcoin),
        _ => Err(MercuryError::NetworkConversionError)
    }
}

#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn get_blockheight(bkp_tx: &BackupTx) -> Result<u32, MercuryError> {
    let tx_bytes = hex::decode(&bkp_tx.tx)?;
    let tx1 = bitcoin::consensus::deserialize::<Transaction>(&tx_bytes)?;

    let lock_time = tx1.lock_time;
    if !(lock_time.is_block_height()) {
        return Err(MercuryError::LocktimeNotBlockHeightError);
    }
    let block_height = lock_time.to_consensus_u32();

    Ok(block_height)
}

#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn is_enclave_pubkey_part_of_coin(coin: &Coin, enclave_pubkey: &str) -> Result<bool, MercuryError> {

    if coin.aggregated_pubkey.is_none() {
        return Err(MercuryError::NoAggregatedPubkeyError);
    }

    let enclave_pubkey = secp256k1_zkp::PublicKey::from_str(enclave_pubkey)?;

    let user_public_key = secp256k1_zkp::PublicKey::from_str(&coin.user_pubkey)?;

    let aggregate_enclave_pubkey = user_public_key.combine(&enclave_pubkey)?;

    let coin_aggregated_pubkey = coin.aggregated_pubkey.as_ref().unwrap();

    let coin_aggregated_pubkey = secp256k1_zkp::PublicKey::from_str(coin_aggregated_pubkey)?;

    return Ok(aggregate_enclave_pubkey == coin_aggregated_pubkey);
}