use config::{Config as ConfigRs, File};
use serde::{Serialize, Deserialize};
use sqlx::postgres::PgConnectOptions;
use std::env;

#[derive(Debug, Serialize, Deserialize)]
pub struct Enclave {
    pub url: String,
    pub allow_deposit: bool,
}

/// Config struct storing all StataChain Entity config
#[derive(Debug, Serialize, Deserialize)]
pub struct ServerConfig {
    /// Bitcoin network name (testnet, regtest, mainnet)
    pub network: String,
    /// Initial deposit backup nlocktime
    pub lockheight_init: u32,
    /// Transfer nlocktime decrement
    pub lh_decrement: u32,
    /// Batch timeout
    pub batch_timeout: u32,
    /// Enclave server list
    pub enclaves: Vec<Enclave>,
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
            network: String::from("regtest"),
            lockheight_init: 10000,
            lh_decrement: 100,
            batch_timeout: 120,
            enclaves: vec![
                Enclave {
                    url: "http://0.0.0.0:18080".to_string(),
                    allow_deposit: true,
                },
                Enclave {
                    url: "http://0.0.0.0:18080".to_string(),
                    allow_deposit: false,
                }
            ],
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
            network: config.get::<String>("network").unwrap_or_else(|_| String::new()),
            lockheight_init: config.get::<u32>("lockheight_init").unwrap_or(0),
            lh_decrement: config.get::<u32>("lh_decrement").unwrap_or(0),
            batch_timeout: config.get::<u32>("batch_timeout").unwrap_or(0),
            enclaves: config.get::<Vec<Enclave>>("enclaves").unwrap_or_else(|_| Vec::new()),
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

        let get_env_or_config_enclave = |key: &str, env_var: &str| -> Vec<Enclave> {

            let env_enclaves = env::var(env_var);

            
            if env_enclaves.is_ok() {

                return serde_json::from_str::<Vec<Enclave>>(&env_enclaves.unwrap()).unwrap();
            }

            settings.get::<Vec<Enclave>>(key).unwrap()
        };

        ServerConfig {
            network: get_env_or_config("network", "BITCOIN_NETWORK"),
            lockheight_init: get_env_or_config("lockheight_init", "LOCKHEIGHT_INIT").parse::<u32>().unwrap(),
            lh_decrement: get_env_or_config("lh_decrement", "LH_DECREMENT").parse::<u32>().unwrap(),
            batch_timeout: get_env_or_config("batch_timeout", "BATCH_TIMEOUT").parse::<u32>().unwrap(),
            enclaves: get_env_or_config_enclave("enclaves", "ENCLAVES"),
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
