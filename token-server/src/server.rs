use sqlx::{Pool, Postgres, postgres::PgPoolOptions};

use crate::server_config::ServerConfig;

pub struct TokenServer {
    pub config: ServerConfig,
    pub pool: Pool<Postgres>,
}

impl TokenServer {
    pub async fn new() -> Self {

        let config = ServerConfig::load();
        let connection_string = config.build_postgres_connection_string();
        
        let pool = 
            PgPoolOptions::new()
            // .max_connections(5)
            .connect_with(connection_string)
            .await
            .unwrap();

        TokenServer {
            config,
            pool,
        }
    }
}