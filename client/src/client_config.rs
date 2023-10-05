use config::Config;
use serde::{Serialize, Deserialize};

/// Config struct storing all StataChain Entity config
#[derive(Debug, Serialize, Deserialize)]
pub struct ClientConfig {
    /// Active lockbox server addresses
    pub statechain_entity: String,

    pub electrum_server: String,
    /// Bitcoin network name (testnet, regtest, mainnet)
    pub network: String,
    /// Initial deposit backup nlocktime
    pub fee_rate_tolerance: u32,
}

impl ClientConfig {
    pub fn load() -> Self {
        let settings = Config::builder()
            .add_source(config::File::with_name("Settings"))
            .build()
            .unwrap();

        ClientConfig {
            statechain_entity: settings.get_string("statechain_entity").unwrap(),
            electrum_server: settings.get_string("electrum_server").unwrap(),
            network: settings.get_string("network").unwrap(),
            fee_rate_tolerance: settings.get_int("fee_rate_tolerance").unwrap() as u32,
        }
    }
}