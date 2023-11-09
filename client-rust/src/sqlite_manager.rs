use mercury_lib::wallet::{Wallet, BackupTx};
use serde_json::json;
use sqlx::{Pool, Sqlite, Row};
use anyhow::{anyhow, Result};

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

    if row.is_empty() {
        return Err(anyhow!("Wallet not found"));
    }

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

pub async fn insert_backup_txs(pool: &Pool<Sqlite>, statechain_id: &str, backup_txs: &Vec<BackupTx>) -> Result<()> {

    let backup_txs_json = json!(backup_txs).to_string();

    let query = "INSERT INTO backup_txs (statechain_id, txs) VALUES ($1, $2)";

    let _ = sqlx::query(query)
            .bind(statechain_id)
            .bind(backup_txs_json)
            .execute(pool)
            .await?;
    
    Ok(())
}

pub async fn get_backup_txs(pool: &Pool<Sqlite>, statechain_id: &str,) -> Result<Vec<BackupTx>> {

    let query = "SELECT txs FROM backup_txs WHERE statechain_id = $1";

    let row = sqlx::query(query)
        .bind(statechain_id)
        .fetch_one(pool)
        .await?;

    if row.is_empty() {
        return Err(anyhow!("Statechain id not found"));
    }

    let backup_txs_json: String = row.get(0);

    let backup_txs: Vec<BackupTx> = serde_json::from_str(&backup_txs_json)?;

    Ok(backup_txs)
}