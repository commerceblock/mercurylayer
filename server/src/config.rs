use std::num::NonZeroU32;

use serde::{Serialize, Deserialize};

/// Config struct storing all StataChain Entity config
#[derive(Debug, Serialize, Deserialize)]
pub struct Config {
    /// Mode: "core", "conductor" or "both"
    // pub mode: Mode, 
    /// Log file location. If not present print to stdout
    pub log_file: String,
    /// Electrum Server Address
    pub electrum_server: String,
    /// Active lockbox server addresses
    pub lockbox: Option<String>,
    /// Bitcoin network name (testnet, regtest, mainnet)
    pub network: String,
    /// Testing mode
    pub testing_mode: bool,
    /// Initial deposit backup nlocktime
    pub lockheight_init: u32,
    /// Transfer nlocktime decrement
    pub lh_decrement: u32,
    /// Required confirmations for deposit
    pub required_confirmation: u32,
    /// Receive address for fee payments
    pub fee_address: String,
    /// Despoit fee (basis points)
    pub fee_deposit: u64,
    /// Withdraw fee (basis points)
    pub fee_withdraw: u64,
    /// Time to allow batch transfer to take
    pub batch_lifetime: u64,
    /// Watch-only
    pub watch_only: bool,
    /// bitcoind node connecton
    pub bitcoind: String,
    /// VDF difficulty factor
    pub difficulty: u64,
    /// Storage config
    // pub storage: StorageConfig,
    // /// Mainstay config
    // pub mainstay: Option<MainstayConfig>,
    // /// Rocket config
    // pub rocket: RocketConfig,
    // /// Conductor config
    // pub conductor: ConductorConfig,
    /// Rate limit (per second) for certain API calls - must be non-zero
    pub rate_limit_slow: Option<NonZeroU32>,
    /// Rate limit (per second) for certain API calls - must be non-zero
    pub rate_limit_fast: Option<NonZeroU32>,
    /// Rate limit (per second) for certain API calls - must be non-zero
    pub rate_limit_id: Option<NonZeroU32>,
    /// Whether to check the deposit proof of work challenge
    pub deposit_pow: bool,
    /// Minimum wallet version required
    pub wallet_version: String,
    /// Server message for wallet users
    pub wallet_message: String,
}

impl Default for Config {
    fn default() -> Config {
        Config {
            // mode: Mode::Both,
            log_file: String::from(""),
            electrum_server: String::from("127.0.0.1:60401"),
            lockbox: None,
            network: String::from("regtest"),
            testing_mode: false,
            lockheight_init: 10000,
            lh_decrement: 100,
            required_confirmation: 3,
            fee_address: String::from("bcrt1qjjwk2rk7nuxt6c79tsxthf5rpnky0sdhjr493x,bcrt1qjjwk2rk7nuxt6c79tsxthf5rpnky0sdhjr493x"),
            fee_deposit: 40,
            fee_withdraw: 40,
            batch_lifetime: 3600,     // 1 hour
            watch_only: false,
            bitcoind: String::from(""),
            difficulty: 4,
            // storage: StorageConfig::default(),
            // mainstay: Some(MainstayConfig::default()),
            // rocket: RocketConfig::default(),
            // conductor: ConductorConfig::default(),
            rate_limit_slow: None,
            rate_limit_fast: None,
            rate_limit_id: None,
            deposit_pow: true,
            wallet_version: "0.6.0".to_string(),
            wallet_message: "".to_string(),
        }
    }
}