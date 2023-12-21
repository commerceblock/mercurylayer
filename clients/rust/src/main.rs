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
mod coin_status;

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
    /*
    /// Create Aggregated Public Key
    Deposit { wallet_name: String, token_id: String, amount: u32 },
    */
    /// Get new token.
    NewToken { },
    /// Get new deposit address. Used to fund a new statecoin.
    NewDepositAddress { wallet_name: String, token_id: String, amount: u32 },
    /* /// Create a new statecoin from a deposit address
    CreateStatecoin { wallet_name: String, deposit_address: String }, */
    /// Broadcast the backup transaction to the network
    BroadcastBackupTransaction { wallet_name: String, statechain_id: String, to_address: String, fee_rate: Option<u64> },
    /// Broadcast the backup transaction to the network
    ListStatecoins { wallet_name: String },
    /// Withdraw funds from a statechain coin to a bitcoin address
    Withdraw { wallet_name: String, statechain_id: String, to_address: String, fee_rate: Option<u64> },
    /// Generate a transfer address to receive funds
    NewTransferAddress { wallet_name: String },
    /// Send a statechain coin to a transfer address
    TransferSend { wallet_name: String, statechain_id: String, to_address: String,  },
    /// Send a statechain coin to a transfer address
    TransferReceive { wallet_name: String },
    /*
    /// Update Coins]
    UpdateCoins { wallet_name: String },
    */
}

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> {
    
    let cli = Cli::parse();

    let client_config = ClientConfig::load().await;

    match cli.command {
        Commands::CreateWallet { name } => {
            let wallet = create_wallet(
                &name, 
                &client_config).await?;

            sqlite_manager::insert_wallet(&client_config.pool, &wallet).await?;
            println!("Wallet created: {:?}", wallet);
        },
        /*Commands::Deposit { wallet_name, token_id, amount } => {
            deposit::execute(&client_config, &wallet_name, &token_id, amount).await?;
        },*/
        Commands::NewToken { } => {
            let token_id = deposit::get_token(&client_config).await?;
            println!("{}", token_id);
        },
        Commands::NewDepositAddress { wallet_name, token_id, amount } => {
            let address = deposit::get_deposit_bitcoin_address(&client_config, &wallet_name, &token_id, amount).await?;
            println!("{}", address);
        },
        /* Commands::CreateStatecoin { wallet_name, deposit_address } => {
            let statecoin = deposit::create_statecoin(&client_config, &wallet_name, &deposit_address).await?;
            println!("Statecoin created: {:?}", statecoin);
        }, */
        Commands::BroadcastBackupTransaction { wallet_name, statechain_id, to_address, fee_rate } => {
            coin_status::update_coins(&client_config, &wallet_name).await?;
            broadcast_backup_tx::execute(&client_config, &wallet_name, &statechain_id, &to_address, fee_rate).await?;
        },
        Commands::ListStatecoins { wallet_name } => {
            coin_status::update_coins(&client_config, &wallet_name).await?;
            let wallet: mercury_lib::wallet::Wallet = get_wallet(&client_config.pool, &wallet_name).await?;
            for coin in wallet.coins.iter() {
                println!("----\ncoin.user_pubkey: {}", coin.user_pubkey);
                println!("coin.aggregated_address: {}", coin.aggregated_address.as_ref().unwrap_or(&"".to_string()));
                println!("coin.address: {}", coin.address);
                println!("coin.statechain_id: {}", coin.statechain_id.as_ref().unwrap_or(&"".to_string()));
                println!("coin.amount: {}", coin.amount.unwrap_or(0));
                println!("coin.status: {}", coin.status);
            }
        },
        Commands::Withdraw { wallet_name, statechain_id, to_address, fee_rate } => {
            coin_status::update_coins(&client_config, &wallet_name).await?;
            withdraw::execute(&client_config, &wallet_name, &statechain_id, &to_address, fee_rate).await?;
        },
        Commands::NewTransferAddress { wallet_name } => {
            let address = transfer_receiver::new_transfer_address(&client_config, &wallet_name).await?;
            println!("{}", address);
        },
        Commands::TransferSend { wallet_name, statechain_id, to_address } => {
            coin_status::update_coins(&client_config, &wallet_name).await?;
            transfer_sender::execute(&client_config, &to_address, &wallet_name, &statechain_id).await?;
            println!("Transfer sent");
        },
        Commands::TransferReceive { wallet_name } => {
            coin_status::update_coins(&client_config, &wallet_name).await?;
            transfer_receiver::execute(&client_config, &wallet_name).await?;
        },
        /*Commands::UpdateCoins { wallet_name }  => {
            utils::update_coins(&client_config, &wallet_name).await?;
        }*/
    }

    client_config.pool.close().await;

    Ok(())
}
