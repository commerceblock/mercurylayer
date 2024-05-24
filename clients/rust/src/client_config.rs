use bitcoin::Network;
use config::Config;
use sqlx::{Sqlite, migrate::MigrateDatabase, SqlitePool};
use anyhow::Result;

/// Config struct storing all StataChain Entity config
pub struct ClientConfig {
    /// Active lockbox server addresses
    pub statechain_entity: String,
    /// Electrum client
    pub electrum_client: electrum_client::Client,
    /// Electrum server url
    pub electrum_server_url: String,
    /// Electrum server type (e.g. electrs, electrumx, etc.)
    pub electrum_type: String,
    /// Bitcoin network name (testnet, regtest, mainnet)
    pub network: Network,
    /// Fee rate tolerance
    pub fee_rate_tolerance: u32,
    /// Confirmation target
    pub confirmation_target: u32,
    /// Database connection pool
    pub pool: sqlx::Pool<Sqlite>,
    /// Tor SOCKS5 proxy address
    pub tor_proxy: Option<String>,
}

impl ClientConfig {
    pub async fn load() -> Self {
        let settings = Config::builder()
            .add_source(config::File::with_name("Settings"))
            .build()
            .unwrap();

        let statechain_entity = settings.get_string("statechain_entity").unwrap();
        let electrum_server = settings.get_string("electrum_server").unwrap();
        let electrum_type = settings.get_string("electrum_type").unwrap();
        let network = settings.get_string("network").unwrap();
        let fee_rate_tolerance = settings.get_int("fee_rate_tolerance").unwrap() as u32;
        let database_file = settings.get_string("database_file").unwrap();
        let confirmation_target = settings.get_int("confirmation_target").unwrap() as u32;

        let tor_proxy = match settings.get_string("tor_proxy") {
            Ok(proxy) => Some(proxy.to_string()),
            Err(_) => None,
        };
        // Open database connection pool

        if !Sqlite::database_exists(&database_file).await.unwrap_or(false) {
            match Sqlite::create_database(&database_file).await {
                Ok(_) => println!("Create db success"),
                Err(error) => panic!("error: {}", error),
            }
        }
    
        let pool: sqlx::Pool<Sqlite> = SqlitePool::connect(&database_file).await.unwrap();
    
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .unwrap();

        // Convert network string to Network enum

        let network = match network.as_str() {
            "signet" => Network::Signet,
            "testnet" => Network::Testnet,
            "regtest" => Network::Regtest,
            "bitcoin" => Network::Bitcoin,
            _ => panic!("Invalid network name"),
        };

        // Create Electrum client

        let electrum_client = electrum_client::Client::new(electrum_server.as_str()).unwrap();

        ClientConfig {
            statechain_entity,
            electrum_client,
            electrum_server_url: electrum_server,
            electrum_type,
            network,
            fee_rate_tolerance,
            confirmation_target,
            pool,
            tor_proxy
        }
    }

    pub fn get_reqwest_client(&self) -> Result<reqwest::Client> {

        match self.tor_proxy {
            Some(ref proxy) => {
                let proxy = reqwest::Proxy::all(proxy)?;
                Ok(reqwest::Client::builder()
                    .proxy(proxy)
                    .build()?)
            },
            None => Ok(reqwest::Client::new()),
            
        }
    }
}
