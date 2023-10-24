use bip39::{Mnemonic, Language};
use secp256k1_zkp::rand::{self, Rng};
use serde::{Serialize, Deserialize};
use anyhow::Result;

use crate::utils::ServerConfig;

#[derive(Debug, Serialize, Deserialize)]
pub struct Wallet {
    pub name: String,
    pub mnemonic: String,
    pub version: String,
    pub state_entity_endpoint: String,
    pub electrum_endpoint: String,
    pub network: String,
    pub blockheight: u32,
    pub initlock: u32,
    pub interval: u32,
    pub tokens: Vec<Token>,
    pub activity: Vec<Activity>,
    pub coins: Vec<Coin>
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Token {
    pub token_id: String,
    pub value: u32,
    pub invoice: String,
    pub confirmed: bool
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Activity {
    pub utxo: String,
    pub amount: u32,
    pub action: String,
    pub date: u64
}

#[derive(Debug, Serialize, Deserialize)]
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

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupTx {
    tx_n: u32,
    tx: String,
    client_public_nonce: String,
    blinding_factor: String
} 

pub fn set_config(wallet: &mut Wallet, config: &ServerConfig) {
    wallet.initlock = config.initlock;
    wallet.interval = config.interval;
}

pub fn generate_mnemonic() -> Result<String> {
    let mut rng = rand::thread_rng();
    let entropy = (0..16).map(|_| rng.gen::<u8>()).collect::<Vec<u8>>(); // 16 bytes of entropy for 12 words
    let mnemonic = Mnemonic::from_entropy_in(Language::English, &entropy)?;
    Ok(mnemonic.to_string())
}
