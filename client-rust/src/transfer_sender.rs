use crate::{client_config::ClientConfig, sqlite_manager::{get_wallet, get_backup_txs}};
use anyhow::{anyhow, Result};
use bitcoin::{Transaction, network, Network, Address};
use mercury_lib::{wallet::{Coin, BackupTx, key_derivation, decode_transfer_address}, utils::get_network};
use secp256k1_zkp::{PublicKey, Secp256k1};

pub async fn execute(client_config: &ClientConfig, recipient_address: &str, wallet_name: &str, statechain_id: &str) -> Result<()> {

    let mut wallet: mercury_lib::wallet::Wallet = get_wallet(&client_config.pool, &wallet_name).await?;

    let mut backup_transactions = get_backup_txs(&client_config.pool, &statechain_id).await?;

    if backup_transactions.len() == 0 {
        return Err(anyhow!("No backup transaction associated with this statechain ID were found"));
    }

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

    let tx1 = &backup_transactions[0];



    Ok(())
}

async fn create_backup_tx_to_receiver(coin:&Coin, bkp_tx1: &BackupTx, recipient_address: &str, network: &str) -> Result<()> {

    let network = get_network(network)?;

    let (_, recipient_user_pubkey, _) = decode_transfer_address(recipient_address).unwrap();

    let tx_bytes = hex::decode(&bkp_tx1.tx)?;
    let tx1 = bitcoin::consensus::deserialize::<Transaction>(&tx_bytes).unwrap();

    let lock_time = tx1.lock_time;
    assert!(lock_time.is_block_height());
    let block_height = lock_time.to_consensus_u32();

    assert!(tx1.input.len() == 1);
    let input = &tx1.input[0];

    let to_address = Address::p2tr(&Secp256k1::new(), recipient_user_pubkey.x_only_public_key().0, None, network);
    
    Ok(())
}