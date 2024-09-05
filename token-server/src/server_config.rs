use config::{Config as ConfigRs, Environment, File};
use serde::{Serialize, Deserialize};
use std::{env, fs};

/// Config struct storing all StataChain Entity config
#[derive(Debug, Serialize, Deserialize)]
pub struct ServerConfig {
    /// Payment processor API URL
    pub processor_url: String,
    /// Payment processor API key
    pub api_key: String,
    /// Token fee unit
    pub unit: String,
    /// Token fee value (satoshis)
    pub fee: String,
    /// Invoice delay (seconds)
    pub delay: u64,
    /// Postgres connection string
    pub connection_string: String,
    /// Tnc string
    pub tnc: String,
}

impl Default for ServerConfig {
    fn default() -> ServerConfig {
        ServerConfig {
            processor_url: String::from("http://0.0.0.0:18080"),
            api_key: String::from("aaaaa"),
            unit: String::from("BTC"),
            fee: String::from("10000"),
            delay: 3600,
            connection_string: String::from("postgresql://postgres:postgres@localhost/mercury"),
            tnc: fs::read_to_string("tnc.html").unwrap_or_else(|_| String::from("")),
        }
    }
}

impl From<ConfigRs> for ServerConfig {
    fn from(config: ConfigRs) -> Self {
        ServerConfig {
            processor_url: config.get::<String>("processor_url").unwrap_or_else(|_| String::new()),
            api_key: config.get::<String>("api_key").unwrap_or_else(|_| String::new()),
            unit: config.get::<String>("unit").unwrap_or_else(|_| String::new()),
            fee: config.get::<String>("fee").unwrap_or_else(|_| String::new()),
            delay: config.get::<u64>("delay").unwrap_or(0),
            connection_string: config.get::<String>("connection_string").unwrap_or_else(|_| String::new()),
            tnc: fs::read_to_string("tnc.html").unwrap_or_else(|_| String::from("")),
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
            processor_url: get_env_or_config("processor_url", "PROCESSOR_URL"),
            api_key: get_env_or_config("api_key", "API_KEY"),
            unit: get_env_or_config("unit", "UNIT"),
            fee: get_env_or_config("fee", "FEE"),
            delay: get_env_or_config("delay", "DELAY").parse::<u64>().unwrap(),
            connection_string: get_env_or_config("connection_string", "CONNECTION_STRING"),
            tnc: fs::read_to_string("tnc.html").unwrap_or_else(|_| String::from("")),
        }
    }
}

