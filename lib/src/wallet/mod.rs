pub mod key_derivation;

use bip39::{Mnemonic, Language};
use secp256k1_zkp::rand::{self, Rng};
use serde::{Serialize, Deserialize};
use anyhow::Result;

use crate::utils::ServerConfig;

#[derive(Debug, Serialize, Deserialize, Clone)]
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Token {
    pub token_id: String,
    pub value: u32,
    pub invoice: String,
    pub confirmed: bool
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Activity {
    pub utxo: String,
    pub amount: u32,
    pub action: String,
    pub date: u64
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Coin {
    
    pub index: u32,
    pub user_privkey: String,
    pub user_pubkey: String,
    pub auth_privkey: String,
    pub auth_pubkey: String,
    /// The coin address is the user_pubkey || auth_pubkey
    /// Used to transfer the coin to another wallet
    pub address: String,
    /// The backup address is the address used in backup transactions
    /// The backup address is the p2tr address of the user_pubkey
    pub backup_address: String,
    pub server_pubkey: Option<String>,
    // The aggregated_pubkey is the user_pubkey + server_pubkey
    pub aggregated_pubkey: Option<String>,
    /// The aggregated address is the P2TR address from aggregated_pubkey
    pub aggregated_address: Option<String>,
    pub utxo_txid: Option<String>,
    pub utxo_vout: Option<u32>,
    pub amount: Option<u32>,
    pub statechain_id: Option<String>,
    pub signed_statechain_id: Option<String>,
    pub locktime: Option<u32>,
    pub secret_nonce: Option<String>,
    pub public_nonce: Option<String>,
    pub blinding_factor: Option<String>,
    pub server_public_nonce: Option<String>,
    pub status: String// CoinStatus,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum CoinStatus {
    INITIALISED,
    AVAILABLE,
    SPENT,
    WITHDRAWN,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
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