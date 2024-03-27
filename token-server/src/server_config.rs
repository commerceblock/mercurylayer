use config::{Config as ConfigRs, Environment, File};
use serde::{Serialize, Deserialize};
use std::env;
use dotenv::dotenv;

/// Config struct storing all StataChain Entity config
#[derive(Debug, Serialize, Deserialize)]
pub struct ServerConfig {
    /// Payment processor API URL
    pub processor_url: String,
    /// Payment processor API key
    pub api_key: String,
    /// Token fee value (satoshis)
    pub fee: String,
    /// Invoice delay (seconds)
    pub delay: u64,
    /// Postgres connection string
    pub connection_string: String,
}

impl Default for ServerConfig {
    fn default() -> ServerConfig {
        ServerConfig {
            processor_url: String::from("http://0.0.0.0:18080"),
            api_key: String::from("aaaaa"),
            fee: String::from("10000"),
            delay: 3600,
            connection_string: String::from("postgresql://postgres:postgres@localhost/mercury"),
        }
    }
}

impl From<ConfigRs> for ServerConfig {
    fn from(config: ConfigRs) -> Self {
        ServerConfig {
            processor_url: config.get::<String>("processor_url").unwrap_or_else(|_| String::new()),
            api_key: config.get::<String>("api_key").unwrap_or_else(|_| String::new()),
            fee: config.get::<String>("fee").unwrap_or_else(|_| String::new()),
            delay: config.get::<u64>("delay").unwrap_or(0),
            connection_string: config.get::<String>("connection_string").unwrap_or_else(|_| String::new()),
        }
    }
}

impl ServerConfig {
    pub fn load() -> Self {
        let mut conf_rs = ConfigRs::default();
        // let _ = conf_rs
        //     // First merge struct default config
        //     .merge(ConfigRs::try_from(&ServerConfig::default()).unwrap());
        // Override with settings in file Settings.toml if exists
        conf_rs.merge(File::with_name("Settings").required(false));
        // Override with settings in file Rocket.toml if exists
        conf_rs.merge(File::with_name("Rocket").required(false));

        dotenv().ok();
        if let Ok(v) = env::var("PROCESSOR_URL") {
            let _ = conf_rs.set("processor_url", v);
        }
        if let Ok(v) = env::var("API_KEY") {
            let _ = conf_rs.set("api_key", v);
        }
        if let Ok(v) = env::var("FEE") {
            let _ = conf_rs.set("fee", v);
        }
        if let Ok(v) = env::var("DELAY") {
            let _ = conf_rs.set("delay", v);
        }
        if let Ok(v) = env::var("CONNECTION_STRING") {
            let _ = conf_rs.set("connection_string", v);
        }
        conf_rs.try_into().unwrap()
    }
}
