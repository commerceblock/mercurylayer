use config::{Config as ConfigRs, Environment, File};
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
    /// Batch timeout
    pub batch_timeout: u32,
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

        let settings = ConfigRs::builder()
            .add_source(File::with_name("Settings"))
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
            batch_timeout: get_env_or_config("batch_timeout", "BATCH_TIMEOUT").parse::<u32>().unwrap(),
        }
    }
}