mod client_config;
mod wallet;
mod utils;
mod sqlite_manager;
mod deposit;
mod transaction;
mod broadcast_backup_tx;
mod withdraw;
mod transfer_sender;
mod transfer_receiver;

use anyhow::Result;
use clap::{Parser, Subcommand};
use client_config::ClientConfig;

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
    /// Withdraw funds from a statechain coin to a bitcoin address
    Withdraw { wallet_name: String, statechain_id: String, to_address: String, fee_rate: Option<u64> },
    /// Generate a transfer address to receive funds
    NewTransferAddress { wallet_name: String },
    /// Send a statechain coin to a transfer address
    TransferSend { recipient_address: String, wallet_name: String, statechain_id: String },
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
            broadcast_backup_tx::execute(&client_config, &wallet_name, &statechain_id, &to_address, fee_rate).await?;
        },
        Commands::ListStatecoins { wallet_name } => {
            let wallet: mercury_lib::wallet::Wallet = get_wallet(&client_config.pool, &wallet_name).await?;
            for coin in wallet.coins.iter() {
                println!("statechain_id: {}", coin.statechain_id.as_ref().unwrap());
                println!("coin.amount: {}", coin.amount.unwrap());
                println!("coin.status: {}", coin.status);
            }
        },
        Commands::Withdraw { wallet_name, statechain_id, to_address, fee_rate } => {
            withdraw::execute(&client_config, &wallet_name, &statechain_id, &to_address, fee_rate).await?;
        },
        Commands::NewTransferAddress { wallet_name } => {
            let address = transfer_receiver::new_transfer_address(&client_config, &wallet_name).await?;
            println!("{}", address);
        },
        Commands::TransferSend { recipient_address, wallet_name, statechain_id } => {
            transfer_sender::execute(&client_config, &recipient_address, &wallet_name, &statechain_id).await?;
        }
    }

    client_config.pool.close().await;

    Ok(())
}
