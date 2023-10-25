use mercury_lib::wallet::Wallet;
use serde_json::json;
use sqlx::{Pool, Sqlite, Row};
use anyhow::Result;

pub async fn insert_wallet(pool: &Pool<Sqlite>, wallet: &Wallet) -> Result<()> {

    let wallet_json = json!(wallet).to_string();

    let query = "INSERT INTO wallet (wallet_name, wallet_json) VALUES ($1, $2)";

    let _ = sqlx::query(query)
            .bind(wallet.name.clone())
            .bind(wallet_json)
            .execute(pool)
            .await?;
    
    Ok(())
}

pub async fn get_wallet(pool: &Pool<Sqlite>, wallet_name: &str) -> Result<Wallet> {
    
    let query = "SELECT wallet_json FROM wallet WHERE wallet_name = $1";

    let row = sqlx::query(query)
        .bind(wallet_name)
        .fetch_one(pool)
        .await?;

    let wallet_json: String = row.get(0);

    let wallet: Wallet = serde_json::from_str(&wallet_json)?;

    Ok(wallet)
}

pub async fn update_wallet(pool: &Pool<Sqlite>, wallet: &Wallet) -> Result<()> {
    
    let wallet_json = json!(wallet).to_string();

    let query = "UPDATE wallet SET wallet_json = $1 WHERE wallet_name = $2";

    let _ = sqlx::query(query)
            .bind(wallet_json)
            .bind(wallet.name.clone())
            .execute(pool)
            .await?;
    
    Ok(())
}
