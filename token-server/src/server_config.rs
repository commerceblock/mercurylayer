use config::Config;
use serde::{Serialize, Deserialize};

/// Config struct storing all StataChain Entity config
#[derive(Debug, Serialize, Deserialize)]
pub struct ServerConfig {
    /// Payment processor API URL
    pub processor_url: String,
    /// Payment processor API key
    pub api_key: String,
    /// Token fee value (satoshis)
    pub fee: String,
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
            processor_url: settings.get_string("processor_url").unwrap(),
            api_key: settings.get_string("api_key").unwrap(),
            fee: settings.get_string("fee").unwrap(),            
            connection_string: settings.get_string("connection_string").unwrap(),
        }
    }
}