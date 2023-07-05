pub mod wallet;
pub mod keystore;
pub mod utils;
pub mod state_entity;
pub mod ecdsa;

use bitcoin::Network;
use clap::{Parser, Subcommand};
use rand::{thread_rng, Rng};
use serde::{Serialize, Deserialize};
use serde_json::json;
use state_entity::api::get_statechain_fee_info;
use utils::client_shim::ClientShim;

use crate::wallet::wallet::Wallet;

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
#[command(propagate_version = true)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Create a new wallet, with a new random BIP 84 extended key
    CreateWallet { wallet_name: String },
    /// Get a new address
    GetNewAddress { wallet_name: String },
    /// Get a wallet balance
    GetBalance { wallet_name: String },
    /// Deposit an amount to create a statecoin
    Deposit { wallet_name: String, amount: u64 },
    /// Deposit an amount to create a statecoin
    GetFeeInfo { },
}

fn main() {
    let cli = Cli::parse();
    let network = Network::Testnet;

    let config = utils::settings::new_config().unwrap();
    let statechain_entity_url = config.get_string("statechain_entity_url").unwrap();
    let electrum_server_url = config.get_string("electrum_server_url").unwrap();

    println!("Statechain entity url: {}", statechain_entity_url);
    println!("Electrum server url: {}", electrum_server_url);

    match &cli.command {
        Commands::CreateWallet { wallet_name } => {
            if wallet_exists(wallet_name) {
                println!("Wallet {} already exists", wallet_name);
                return;
            }
            create_wallet(wallet_name, network, &electrum_server_url, &statechain_entity_url);
        }
        Commands::GetNewAddress { wallet_name } => {
            get_new_address(wallet_name, &electrum_server_url, &statechain_entity_url);
        },
        Commands::GetBalance { wallet_name } => {
            get_balance(wallet_name, &electrum_server_url, &statechain_entity_url);
        },
        Commands::Deposit { wallet_name, amount } => {
            deposit(wallet_name, amount, &electrum_server_url, &statechain_entity_url);
        },
        Commands::GetFeeInfo {  } => {
            get_fee_info(&statechain_entity_url);
        },
    }

    println!("Hello, world!");


}

fn wallet_exists(wallet_name: &str) -> bool {
    let home_dir = dirs::home_dir();

    let mut path = home_dir.clone().unwrap();
    path.push(".statechain");
    path.push("wallets");
    path.push(format!("{}.json", wallet_name));

    std::path::Path::new(&path).exists()
}

fn create_wallet(wallet_name: &str, network: Network, electrum_server_url: &str, statechain_entity_url: &str) {
    let mut seed = [0u8; 32];
    thread_rng().fill(&mut seed);
    let wallet = Wallet::new(&seed, wallet_name, network, electrum_server_url, statechain_entity_url);
    wallet.save();
    println!("Wallet {} created: {}", wallet_name, wallet);
}

fn get_new_address(wallet_name: &String, electrum_server_url: &str, statechain_entity_url: &str) {
    let mut wallet = Wallet::load(wallet_name, electrum_server_url, statechain_entity_url).unwrap();
    let (address, index) = wallet.keys.get_new_address().unwrap();
    wallet.save();
    let obj = json!({"address": address.to_string(), "index": index});

    println!("{}", serde_json::to_string_pretty(&obj).unwrap());
}

fn deposit(wallet_name: &String, amount: &u64, electrum_server_url: &str, statechain_entity_url: &str) {
    let mut wallet = Wallet::load(wallet_name, electrum_server_url, statechain_entity_url).unwrap();
    state_entity::deposit::deposit(&mut wallet, amount).unwrap();
}

fn get_balance(wallet_name: &String, electrum_server_url: &str, statechain_entity_url: &str) {
    let mut wallet = Wallet::load(wallet_name, electrum_server_url, statechain_entity_url).unwrap();

    let balance = wallet.get_all_addresses_balance();

    #[derive(Serialize, Deserialize, Debug)]
    struct Balance {
        address: String,
        balance: u64,
        unconfirmed_balance: i64,
    }

    let balance = balance
        .iter()
        .map(|(address, balance)| Balance {
            address: address.to_string(),
            balance: balance.confirmed,
            unconfirmed_balance: balance.unconfirmed,
        })
        .collect::<Vec<Balance>>();

    let obj = json!(balance);

    println!("{}", serde_json::to_string_pretty(&obj).unwrap());
}

fn get_fee_info(statechain_entity_url: &str) {
    let client_shim = ClientShim::new(statechain_entity_url);

    let se_fee_info = get_statechain_fee_info(&client_shim).unwrap();

    let obj = json!(se_fee_info);

    println!("{}", serde_json::to_string_pretty(&obj).unwrap());
}
