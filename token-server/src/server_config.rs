use config::{Config as ConfigRs, Environment, File};
use serde::{Serialize, Deserialize};
use sqlx::postgres::PgConnectOptions;
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
    /// Tnc string
    pub tnc: String,
    /// Database user
    pub db_user: String,
    /// Database password
    pub db_password: String,
    /// Database host
    pub db_host: String,
    /// Database port
    pub db_port: u16,
    /// Database name
    pub db_name: String,
}

impl Default for ServerConfig {
    fn default() -> ServerConfig {
        ServerConfig {
            processor_url: String::from("http://0.0.0.0:18080"),
            api_key: String::from("aaaaa"),
            unit: String::from("BTC"),
            fee: String::from("10000"),
            delay: 3600,
            tnc: fs::read_to_string("tnc.html").unwrap_or_else(|_| String::from("")),
            db_user: String::from("postgres"),
            db_password: String::from("postgres"),
            db_host: String::from("db_server"),
            db_port: 5432,
            db_name: String::from("mercury"),
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
            tnc: fs::read_to_string("tnc.html").unwrap_or_else(|_| String::from("")),
            db_user: config.get::<String>("db_user").unwrap_or_else(|_| String::new()),
            db_password: config.get::<String>("db_password").unwrap_or_else(|_| String::new()),
            db_host: config.get::<String>("db_host").unwrap_or_else(|_| String::new()),
            db_port: config.get::<u16>("db_port").unwrap_or(0),
            db_name: config.get::<String>("db_name").unwrap_or_else(|_| String::new()),
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
            tnc: fs::read_to_string("tnc.html").unwrap_or_else(|_| String::from("")),
            db_user: get_env_or_config("db_user", "DB_USER"),
            db_password: get_env_or_config("db_password", "DB_PASSWORD"),
            db_host: get_env_or_config("db_host", "DB_HOST"),
            db_port: get_env_or_config("db_port", "DB_PORT").parse::<u16>().unwrap(),
            db_name: get_env_or_config("db_name", "DB_NAME"),
        }
    }

    pub fn build_postgres_connection_string(&self) -> PgConnectOptions {
        PgConnectOptions::new()
            .host(&self.db_host)
            .username(&self.db_user)
            .password(&self.db_password)
            .port(self.db_port)
            .database(&self.db_name)
    }
}

