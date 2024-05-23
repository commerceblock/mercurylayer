use config::Config;
use serde::{Serialize, Deserialize};
use std::env;

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
            processor_url: get_env_or_config("processor_url", "PROCESSOR_URL"),
            api_key: get_env_or_config("api_key", "API_KEY"),
            fee: get_env_or_config("fee", "FEE"),
            delay: get_env_or_config("delay", "DELAY").parse::<u64>().unwrap(),
            connection_string: get_env_or_config("connection_string", "CONNECTION_STRING"),
        }
    }
}

