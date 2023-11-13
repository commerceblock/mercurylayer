use crate::{client_config::ClientConfig, sqlite_manager::{get_wallet, get_backup_txs}, transaction::new_transaction};
use anyhow::{anyhow, Result};
use bitcoin::{Transaction, network, Network, Address};
use mercury_lib::{wallet::{Coin, BackupTx, key_derivation}, utils::{get_network, get_blockheight}, decode_transfer_address};
use secp256k1_zkp::{PublicKey, Secp256k1};

pub async fn execute(client_config: &ClientConfig, recipient_address: &str, wallet_name: &str, statechain_id: &str) -> Result<()> {

    let mut wallet: mercury_lib::wallet::Wallet = get_wallet(&client_config.pool, &wallet_name).await?;

    let mut backup_transactions = get_backup_txs(&client_config.pool, &statechain_id).await?;

    if backup_transactions.len() == 0 {
        return Err(anyhow!("No backup transaction associated with this statechain ID were found"));
    }

    let qt_backup_tx = backup_transactions.len() as u32;

    backup_transactions.sort_by(|a, b| a.tx_n.cmp(&b.tx_n));

    let new_tx_n = backup_transactions.len() as u32 + 1;

    let coin = wallet.coins.iter_mut().find(|tx| tx.statechain_id == Some(statechain_id.to_string()));

    if coin.is_none() {
        return Err(anyhow!("No coins associated with this statechain ID were found"));
    }

    let coin = coin.unwrap();

    if coin.amount.is_none() {
        return Err(anyhow::anyhow!("coin.amount is None"));
    }

    let bkp_tx1 = &backup_transactions[0];

    let signed_tx = create_backup_tx_to_receiver(client_config, coin, bkp_tx1, recipient_address, qt_backup_tx, &wallet.network).await?;

    println!("signed_tx: {}", signed_tx);

    Ok(())
}

async fn create_backup_tx_to_receiver(client_config: &ClientConfig, coin: &mut Coin, bkp_tx1: &BackupTx, recipient_address: &str, qt_backup_tx: u32, network: &str) -> Result<String> {

    let block_height = Some(get_blockheight(bkp_tx1)?);

    let is_withdrawal = false;
    let signed_tx = new_transaction(client_config, coin, recipient_address, qt_backup_tx, is_withdrawal, block_height, network).await?;

    Ok(signed_tx)
}