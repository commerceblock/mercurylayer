use serde::{Serialize, Deserialize};
use anyhow::{anyhow, Result};

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

pub fn get_network(network: &str) -> Result<bitcoin::Network> {
    match network {
        "signet" => Ok(bitcoin::Network::Signet),
        "testnet" => Ok(bitcoin::Network::Testnet),
        "regtest" => Ok(bitcoin::Network::Regtest),
        "mainnet" => Ok(bitcoin::Network::Bitcoin),
        _ => Err(anyhow!("Unkown network"))
    }
}