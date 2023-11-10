use crate::{client_config::ClientConfig, sqlite_manager::{get_wallet, insert_backup_txs, update_wallet, get_backup_txs, update_backup_txs}, transaction::new_transaction};
use anyhow::{anyhow, Result};
use chrono::Utc;
use electrum_client::ElectrumApi;
use mercury_lib::wallet::{BackupTx, Activity, CoinStatus};

pub async fn execute(client_config: &ClientConfig, wallet_name: &str, statechain_id: &str, to_address: &str, fee_rate: Option<u64>) -> Result<()>{

    let mut wallet: mercury_lib::wallet::Wallet = get_wallet(&client_config.pool, &wallet_name).await?;

    let mut backup_txs = get_backup_txs(&client_config.pool, &statechain_id).await?;
    
    if backup_txs.len() == 0 {
        return Err(anyhow!("No backup transaction associated with this statechain ID were found"));
    }

    let new_tx_n = backup_txs.len() as u32 + 1;

    let coin = wallet.coins.iter_mut().find(|tx| tx.statechain_id == Some(statechain_id.to_string()));

    if coin.is_none() {
        return Err(anyhow!("No coins associated with this statechain ID were found"));
    }

    let coin = coin.unwrap();

    if coin.amount.is_none() {
        return Err(anyhow::anyhow!("coin.amount is None"));
    }

    let signed_tx = new_transaction(client_config, coin, &to_address, &wallet.network).await?;

    if coin.public_nonce.is_none() {
        return Err(anyhow::anyhow!("coin.public_nonce is None"));
    }

    if coin.blinding_factor.is_none() {
        return Err(anyhow::anyhow!("coin.blinding_factor is None"));
    }

    if coin.statechain_id.is_none() {
        return Err(anyhow::anyhow!("coin.statechain_id is None"));
    }

    let backup_tx = BackupTx {
        tx_n: new_tx_n,
        tx: signed_tx.clone(),
        client_public_nonce: coin.public_nonce.as_ref().unwrap().to_string(),
        blinding_factor: coin.blinding_factor.as_ref().unwrap().to_string(),
    };

    backup_txs.push(backup_tx);

    update_backup_txs(&client_config.pool, &coin.statechain_id.as_ref().unwrap(), &backup_txs).await?;

    let tx_bytes = hex::decode(&signed_tx)?;
    let txid = client_config.electrum_client.transaction_broadcast_raw(&tx_bytes)?;
    println!("Broadcasting withdrawal transaction: {}", txid);

    coin.tx_withdraw = Some(txid.to_string());
    coin.status = CoinStatus::WITHDRAWING;

    let date = Utc::now(); // This will get the current date and time in UTC
    let iso_string = date.to_rfc3339(); // Converts the date to an ISO 8601 string

    let activity = Activity {
        utxo: txid.to_string(),
        amount: coin.amount.unwrap(),
        action: "Withdraw".to_string(),
        date: iso_string
    };

    wallet.activities.push(activity);

    update_wallet(&client_config.pool, &wallet).await?;

    Ok(())

}