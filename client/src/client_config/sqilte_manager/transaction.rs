use sqlx::Row;

use crate::client_config::ClientConfig;

impl ClientConfig {

    pub async fn count_backup_tx(&self, statechain_id: &str) -> u32 {

        let row = sqlx::query("SELECT count(*) FROM backup_transaction WHERE statechain_id = $1")
            .bind(statechain_id)
            .fetch_one(&self.pool)
            .await
            .unwrap();

        let count = row.get::<u32, _>(0);

        count
    }
}