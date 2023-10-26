mod client_config;
mod wallet;
mod utils;
mod sqlite_manager;
mod deposit;

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
    }

    client_config.pool.close().await;

    Ok(())
}
