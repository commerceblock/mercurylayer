mod client_config;
mod wallet;

use clap::{Parser, Subcommand};
use client_config::ClientConfig;

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
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    
    let cli = Cli::parse();

    let client_config = ClientConfig::load().await;

    match cli.command {
        Commands::CreateWallet { name } => {
            wallet::create_wallet(&name, &client_config); 
        }
    }
}
