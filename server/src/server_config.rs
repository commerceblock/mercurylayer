use config::{Config as ConfigRs, Environment, File};
use serde::{Serialize, Deserialize};
use std::env;
use dotenv::dotenv;

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

impl Default for ServerConfig {
    fn default() -> ServerConfig {
        ServerConfig {
            lockbox: None,
            network: String::from("regtest"),
            lockheight_init: 10000,
            lh_decrement: 100,
            connection_string: String::from("postgresql://postgres:postgres@localhost/mercury"),
        }
    }
}

impl From<ConfigRs> for ServerConfig {
    fn from(config: ConfigRs) -> Self {
        ServerConfig {
            lockbox: config.get::<Option<String>>("lockbox").unwrap_or(None),
            network: config.get::<String>("network").unwrap_or_else(|_| String::new()),
            lockheight_init: config.get::<u32>("lockheight_init").unwrap_or(0),
            lh_decrement: config.get::<u32>("lh_decrement").unwrap_or(0),
            connection_string: config.get::<String>("connection_string").unwrap_or_else(|_| String::new()),
        }
    }
}

impl ServerConfig {
    pub fn load() -> Self {
        let mut conf_rs = ConfigRs::default();
        let _ = conf_rs
            // First merge struct default config
            .merge(ConfigRs::try_from(&ServerConfig::default()).unwrap());
        // Override with settings in file Settings.toml if exists
        conf_rs.merge(File::with_name("Settings").required(false));
        // Override with settings in file Rocket.toml if exists
        conf_rs.merge(File::with_name("Rocket").required(false));

        dotenv().ok();
        if let Ok(v) = env::var("LOCKBOX") {
            let _ = conf_rs.set("lockbox", v);
        }
        if let Ok(v) = env::var("NETWORK") {
            let _ = conf_rs.set("network", v);
        }
        if let Ok(v) = env::var("LOCKHEIGHT_INIT") {
            let _ = conf_rs.set("lockheight_init", v);
        }
        if let Ok(v) = env::var("LH_DECREMENT") {
            let _ = conf_rs.set("lh_decrement", v);
        }
        if let Ok(v) = env::var("CONNECTION_STRING") {
            let _ = conf_rs.set("connection_string", v);
        }
        conf_rs.try_into().unwrap()
    }
}