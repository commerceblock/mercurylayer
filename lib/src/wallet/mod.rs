pub mod key_derivation;
pub mod cpfp_tx;

use std::{fmt, str::FromStr};

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
    pub activities: Vec<Activity>,
    pub coins: Vec<Coin>,
    pub settings: Settings,
}


#[allow(non_snake_case)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub network: String,
    pub block_explorerURL: Option<String>,
    pub torProxyHost: Option<String>,
    pub torProxyPort: Option<String>,
    pub torProxyControlPassword: Option<String>,
    pub torProxyControlPort: Option<String>,
    pub statechainEntityApi: String,
    pub torStatechainEntityApi: Option<String>,
    pub electrumProtocol: String,
    pub electrumHost: String,
    pub electrumPort: String,
    pub electrumType: String,
    pub notifications: bool,
    pub tutorials: bool
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Token {
    pub btc_payment_address: String,
    pub fee: String,
    pub lightning_invoice: String,
    pub processor_id: String,
    pub token_id: String,
    pub confirmed: bool,
    pub spent: bool,
    pub expiry: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Activity {
    pub utxo: String,
    pub amount: u32,
    pub action: String,
    pub date: String
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Coin {
    
    pub index: u32,
    pub user_privkey: String,
    pub user_pubkey: String,
    pub auth_privkey: String,
    pub auth_pubkey: String,
    pub derivation_path: String,
    pub fingerprint: String,
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
    pub tx_cpfp: Option<String>,
    pub tx_withdraw: Option<String>,
    pub withdrawal_address: Option<String>,
    pub status: CoinStatus,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum CoinStatus {
    INITIALISED, //  address generated but no Tx0 yet
    IN_MEMPOOL, // Tx0 in mempool
    UNCONFIRMED, // Tx0 is awaiting more confirmations before coin is available to be sent
    CONFIRMED, // Tx0 confirmed and coin available to be sent
    IN_TRANSFER, // transfer-sender performed, but receiver hasn't completed transfer-receiver
    WITHDRAWING, // withdrawal tx signed and broadcast but not yet confirmed
    TRANSFERRED, // the coin was transferred
    WITHDRAWN, // the coin was withdrawn
}

impl fmt::Display for CoinStatus {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        // Match the enum variants
        write!(f, "{}", match self {
            Self::INITIALISED => "INITIALISED",
            Self::IN_MEMPOOL => "IN_MEMPOOL",
            Self::UNCONFIRMED => "UNCONFIRMED",
            Self::CONFIRMED => "CONFIRMED",
            Self::IN_TRANSFER => "IN_TRANSFER",
            Self::WITHDRAWING => "WITHDRAWING",
            Self::TRANSFERRED => "TRANSFERRED",
            Self::WITHDRAWN => "WITHDRAWN",
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CoinStatusParseError;

impl fmt::Display for CoinStatusParseError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "provided string was not a valid CoinStatus")
    }
}

impl std::error::Error for CoinStatusParseError {}

impl FromStr for CoinStatus {
    type Err = CoinStatusParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "INITIALISED" => Ok(CoinStatus::INITIALISED),
            "IN_MEMPOOL" => Ok(CoinStatus::IN_MEMPOOL),
            "UNCONFIRMED" => Ok(CoinStatus::UNCONFIRMED),
            "CONFIRMED" => Ok(CoinStatus::CONFIRMED),
            "IN_TRANSFER" => Ok(CoinStatus::IN_TRANSFER),
            "WITHDRAWING" => Ok(CoinStatus::WITHDRAWING),
            "TRANSFERRED" => Ok(CoinStatus::TRANSFERRED),
            "WITHDRAWN" => Ok(CoinStatus::WITHDRAWN),
            _ => Err(CoinStatusParseError {}),
        }
    }
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StatechainBackupTxs {
    pub statechain_id: String,
    pub backup_txs: Vec<BackupTx>
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BackupTx {
    pub tx_n: u32,
    pub tx: String,
    pub client_public_nonce: String,
    pub server_public_nonce: String,
    pub client_public_key: String,
    pub server_public_key: String,
    pub blinding_factor: String,
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
