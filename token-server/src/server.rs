use sqlx::{Pool, Postgres, postgres::PgPoolOptions};

use crate::server_config::ServerConfig;

pub struct TokenServer {
    pub config: ServerConfig,
    pub pool: Pool<Postgres>,
}

impl TokenServer {
    pub async fn new() -> Self {

        let config = ServerConfig::load();
        
        let pool = 
            PgPoolOptions::new()
            // .max_connections(5)
            .connect(&config.connection_string)
            .await
            .unwrap();

        TokenServer {
            config,
            pool,
        }
    }
}