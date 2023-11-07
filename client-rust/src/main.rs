mod client_config;
mod wallet;
mod utils;
mod sqlite_manager;
mod deposit;
mod transaction;

use anyhow::{anyhow, Result};
use clap::{Parser, Subcommand};
use client_config::ClientConfig;
use electrum_client::ElectrumApi;
use mercury_lib::wallet::cpfp_tx;
use sqlite_manager::get_backup_txs;

use crate::{wallet::create_wallet, sqlite_manager::get_wallet};

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
#[command(propagate_version = true)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Create a wallet
    CreateWallet { name: String },
    /// Create Aggregated Public Key
    Deposit { wallet_name: String, token_id: String, amount: u32 },
    /// Broadcast the backup transaction to the network
    BroadcastBackupTransaction { wallet_name: String, statechain_id: String, to_address: String, fee_rate: Option<u64> },
    /// Broadcast the backup transaction to the network
    ListStatecoins { wallet_name: String },
}

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> {
    
    let cli = Cli::parse();

    let client_config = ClientConfig::load().await;

    match cli.command {
        Commands::CreateWallet { name } => {
            let wallet = create_wallet(
                &name, 
                &client_config.electrum_client, 
                &client_config.electrum_server_url,
                &client_config.statechain_entity, 
                client_config.network).await?;

            sqlite_manager::insert_wallet(&client_config.pool, &wallet).await?;
            println!("Wallet created: {:?}", wallet);
        },
        Commands::Deposit { wallet_name, token_id, amount } => {
            
            deposit::execute(&client_config, &wallet_name, &token_id, amount).await?;

        },
        Commands::BroadcastBackupTransaction { wallet_name, statechain_id, to_address, fee_rate } => {
            let wallet: mercury_lib::wallet::Wallet = get_wallet(&client_config.pool, &wallet_name).await?;
            // transaction::broadcast_backup_transaction(&client_config, &wallet).await?;

            let backup_txs = get_backup_txs(&client_config.pool, &statechain_id).await?;
            
            let backup_tx = backup_txs.iter().max_by_key(|tx| tx.tx_n);

            if backup_tx.is_none() {
                return Err(anyhow!("No backup transaction found"));
            }

            let backup_tx = backup_tx.unwrap();

            let coin = wallet.coins.iter().find(|tx| tx.statechain_id == Some(statechain_id.clone()));

            if coin.is_none() {
                return Err(anyhow!("No coin found"));
            }

            let coin = coin.unwrap();

            let fee_rate = match fee_rate {
                Some(fee_rate) => fee_rate,
                None => {
                    let fee_rate_btc_per_kb = client_config.electrum_client.estimate_fee(1)?;
                    let fee_rate_sats_per_byte = (fee_rate_btc_per_kb * 100000.0) as u64;
                    fee_rate_sats_per_byte
                },
            };

            let cpfp_tx = cpfp_tx::create(&backup_tx, &coin, &to_address, fee_rate, &wallet.network)?;

            // println!("Broadcasting backup transaction: {}", backup_tx.tx);
            // println!("Broadcasting CPFP transaction: {}", cpfp_tx);


            let tx_bytes = hex::decode(&backup_tx.tx)?;
            let txid = client_config.electrum_client.transaction_broadcast_raw(&tx_bytes)?;
            println!("Broadcasting backup transaction: {}", txid);

            let tx_bytes = hex::decode(&cpfp_tx)?;
            let txid = client_config.electrum_client.transaction_broadcast_raw(&tx_bytes)?;
            println!("Broadcasting CPFP transaction: {}", txid);


        },
        Commands::ListStatecoins { wallet_name } => {
            let wallet: mercury_lib::wallet::Wallet = get_wallet(&client_config.pool, &wallet_name).await?;
            for coin in wallet.coins.iter() {
                println!("statechain_id: {}", coin.statechain_id.as_ref().unwrap());
                println!("coin.amount: {}", coin.amount.unwrap());
                println!("coin.status: {}", coin.status);
            }
        },
    }

    client_config.pool.close().await;

    Ok(())
}
