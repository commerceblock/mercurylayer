pub mod sqilte_manager;

use bitcoin::Network;
use config::Config;
use sqlx::{Sqlite, migrate::MigrateDatabase, SqlitePool};

/// Config struct storing all StataChain Entity config
pub struct ClientConfig {
    /// Active lockbox server addresses
    pub statechain_entity: String,
    /// Electrum server address
    pub electrum_client: electrum_client::Client,
    /// Bitcoin network name (testnet, regtest, mainnet)
    pub network: Network,
    /// Initial deposit backup nlocktime
    pub fee_rate_tolerance: u32,
    /// Database connection pool
    pub pool: sqlx::Pool<Sqlite>,
}

impl ClientConfig {
    pub async fn load() -> Self {
        let settings = Config::builder()
            .add_source(config::File::with_name("Settings"))
            .build()
            .unwrap();

        let statechain_entity = settings.get_string("statechain_entity").unwrap();
        let electrum_server = settings.get_string("electrum_server").unwrap();
        let network = settings.get_string("network").unwrap();
        let fee_rate_tolerance = settings.get_int("fee_rate_tolerance").unwrap() as u32;
        let database_file = settings.get_string("database_file").unwrap();

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
            "mainnet" => Network::Bitcoin,
            _ => panic!("Invalid network name"),
        };

        // Create Electrum client

        let electrum_client = electrum_client::Client::new(electrum_server.as_str()).unwrap();


        ClientConfig {
            statechain_entity,
            electrum_client,
            network,
            fee_rate_tolerance,
            pool,
        }
    }
}