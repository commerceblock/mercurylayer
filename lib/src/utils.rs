use bitcoin::Transaction;
use serde::{Serialize, Deserialize};
use anyhow::{anyhow, Result};

use crate::wallet::BackupTx;

#[derive(Serialize, Deserialize)]
pub struct ServerConfig {
    pub initlock: u32,
    pub interval: u32,
}

pub struct InfoConfig {
    pub initlock: u32,
    pub interval: u32,
    pub fee_rate_sats_per_byte: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PubKeyInfo {
    pub server_pubkey: String,
    pub tx_n: u32,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KeyListResponsePayload {
    pub list_keyinfo: Vec<PubKeyInfo>,
}

pub fn get_network(network: &str) -> Result<bitcoin::Network> {
    match network {
        "signet" => Ok(bitcoin::Network::Signet),
        "testnet" => Ok(bitcoin::Network::Testnet),
        "regtest" => Ok(bitcoin::Network::Regtest),
        "mainnet" => Ok(bitcoin::Network::Bitcoin),
        _ => Err(anyhow!("Unkown network"))
    }
}

pub fn get_blockheight(bkp_tx: &BackupTx) -> Result<u32> {
    let tx_bytes = hex::decode(&bkp_tx.tx)?;
    let tx1 = bitcoin::consensus::deserialize::<Transaction>(&tx_bytes).unwrap();

    let lock_time = tx1.lock_time;
    if !(lock_time.is_block_height()) {
        return Err(anyhow!("Locktime is not block height"));
    }
    let block_height = lock_time.to_consensus_u32();

    Ok(block_height)
}