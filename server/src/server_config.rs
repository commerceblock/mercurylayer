use config::Config;
use serde::{Serialize, Deserialize};

/// Config struct storing all StataChain Entity config
#[derive(Debug, Serialize, Deserialize)]
pub struct ServerConfig {
    /// Active lockbox server addresses
    pub lockbox: Option<String>,
    /// Bitcoin network name (testnet, regtest, mainnet)
    pub network: String,
    /// Initial deposit backup nlocktime
    pub lockheight_init: u32,
    /// Transfer nlocktime decrement
    pub lh_decrement: u32,
    /// Postgres connection string
    pub connection_string: String,
}

impl ServerConfig {
    pub fn load() -> Self {
        let settings = Config::builder()
            .add_source(config::File::with_name("Settings"))
            .build()
            .unwrap();

        ServerConfig {
            lockbox: Some(settings.get_string("lockbox").unwrap()),
            network: settings.get_string("network").unwrap(),
            lockheight_init: settings.get_int("lockheight_init").unwrap() as u32,
            lh_decrement: settings.get_int("lh_decrement").unwrap() as u32,
            connection_string: settings.get_string("connection_string").unwrap(),
        }
    }
}