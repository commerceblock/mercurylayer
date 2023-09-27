use sqlx::{Sqlite, Row};

pub async fn count_backup_tx(pool: &sqlx::Pool<Sqlite>, statechain_id: &str) -> u32 {

    let row = sqlx::query("SELECT count(*) FROM backup_transaction WHERE statechain_id = $1")
        .bind(statechain_id)
        .fetch_one(pool)
        .await
        .unwrap();

    let count = row.get::<u32, _>(0);

    count
}

