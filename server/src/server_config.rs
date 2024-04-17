use config::Config;
use serde::{Serialize, Deserialize};
use std::env;

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

        // Function to fetch a setting from the environment or fallback to the config file
        let get_env_or_config = |key: &str, env_var: &str| -> String {
            env::var(env_var).unwrap_or_else(|_| settings.get_string(key).unwrap())
        };

        ServerConfig {
            lockbox: Some(get_env_or_config("lockbox", "LOCKBOX_URL")),
            network: get_env_or_config("network", "BITCOIN_NETWORK"),
            lockheight_init: get_env_or_config("lockheight_init", "LOCKHEIGHT_INIT").parse::<u32>().unwrap(),
            lh_decrement: get_env_or_config("lh_decrement", "LH_DECREMENT").parse::<u32>().unwrap(),
            connection_string: get_env_or_config("connection_string", "DATABASE_CONNECTION_STRING"),
        }
    }
}