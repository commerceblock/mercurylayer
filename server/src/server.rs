use std::time::Duration;

use sqlx::{Pool, Postgres, postgres::PgPoolOptions};

use crate::server_config::ServerConfig;

pub struct StateChainEntity {
    pub pool: Pool<Postgres>,
}

impl StateChainEntity {
    pub async fn new() -> Self {

        let config = ServerConfig::load();
        let connection_string = config.build_postgres_connection_string();

        let pool = 
            PgPoolOptions::new()
            .max_connections(10)
            .acquire_timeout(Duration::from_secs(30))  // Increase the timeout duration
            .connect_with(connection_string)
            .await
            .unwrap();

        StateChainEntity {
            pool,
        }
    }
}