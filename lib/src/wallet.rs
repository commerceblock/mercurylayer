use serde::{Serialize, Deserialize};

use crate::utils::ServerConfig;

#[derive(Serialize, Deserialize)]
pub struct Wallet {
    pub name: String,
    pub mnemonic: String,
    pub version: String,
    pub state_entity_endpoint: String,
    pub electrum_endpoint: String,
    pub blockheight: u32,
    pub initlock: u32,
    pub interval: u32,
    pub tokens: Vec<Token>,
    pub activity: Vec<Activity>,
    pub coins: Vec<Coin>
}

#[derive(Serialize, Deserialize)]
pub struct Token {
    pub token_id: String,
    pub value: u32,
    pub invoice: String,
    pub confirmed: bool
}

#[derive(Serialize, Deserialize)]
pub struct Activity {
    pub utxo: String,
    pub amount: u32,
    pub action: String,
    pub date: u64
}

#[derive(Serialize, Deserialize)]
pub struct Coin {
    pub utxo: String,
    pub index: u32,
    pub address: String,
    pub amount: u32,
    pub statechain_id: String,
    pub privkey: String,
    pub auth_key: String,
    pub locktime: u32,
    pub status: String,
}

#[derive(Serialize, Deserialize)]
pub struct BackupTx {
    tx_n: u32,
    tx: String,
    client_public_nonce: String,
    blinding_factor: String
} 

pub fn setConfig(wallet: &mut Wallet, config: &ServerConfig) {
    wallet.initlock = config.initlock;
    wallet.interval = config.interval;
}