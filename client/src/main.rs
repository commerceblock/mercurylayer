mod deposit;
mod key_derivation;
mod error;
mod electrum;
mod wallet;
mod transaction;
mod send_backup;

use std::str::FromStr;

use bitcoin::Address;
use clap::{Parser, Subcommand};
use electrum_client::ListUnspentRes;
use serde::{Serialize, Deserialize};
use serde_json::json;
use sqlx::{Sqlite, migrate::MigrateDatabase, SqlitePool};


#[derive(Parser)]
#[command(author, version, about, long_about = None)]
#[command(propagate_version = true)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Show mnemonic
    ShowMnemonic { },
    /// Create Aggregated Public Key
    Deposit { token_id: String, amount: u64 },
    /// Get a wallet balance
    GetBalance { },
    /// Broadcast the backup transaction to the network
    BroadcastBackupTransaction { statechain_id: String },
    /// Send all backup funds to the address provided
    SendBackup { address: String, fee_rate: Option<u64> },
    /// Generate a transfer address to receive funds
    NewTransferAddress { },
    /// Send a statechain coin to a transfer address
    TransferSend { recipient_address: String, statechain_id: String }
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    // let network = bitcoin::Network::Bitcoin;
    let network = bitcoin::Network::Signet;

    let client = electrum_client::Client::new("tcp://127.0.0.1:50001").unwrap();

    let cli = Cli::parse();

    if !Sqlite::database_exists("wallet.db").await.unwrap_or(false) {
        match Sqlite::create_database("wallet.db").await {
            Ok(_) => println!("Create db success"),
            Err(error) => panic!("error: {}", error),
        }
    }

    let pool = SqlitePool::connect("wallet.db").await.unwrap();

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .unwrap();

    match cli.command {
        Commands::ShowMnemonic { } => {
            let mnemonic = key_derivation::get_mnemonic(&pool).await;
            println!("{}", serde_json::to_string_pretty(&json!({
                "mnemonic": mnemonic,
            })).unwrap());
        },
        Commands::Deposit { token_id, amount } => {
            let token_id = uuid::Uuid::new_v4() ; // uuid::Uuid::parse_str(&token_id).unwrap();
            let statechain_id = deposit::execute(&pool, token_id, amount, network).await.unwrap();
            println!("{}", serde_json::to_string_pretty(&json!({
                "statechain_id": statechain_id,
            })).unwrap());
        },
        Commands::GetBalance {  } => {

            #[derive(Serialize, Deserialize, Debug)]
            struct Balance {
                address: String,
                balance: u64,
                unconfirmed_balance: i64,
            }

            let (agg_addresses, backup_addresses) = wallet::get_all_addresses(&pool, network).await;

            let agg_result: Vec<Balance> = agg_addresses.iter().map(|address| {
                let balance_res = electrum::get_address_balance(&client, &address);
                Balance {
                    address: address.to_string(),
                    balance: balance_res.confirmed,
                    unconfirmed_balance: balance_res.unconfirmed,
                }
            }).collect();

            let backup_result: Vec<Balance> = backup_addresses.iter().map(|address| {
                let balance_res = electrum::get_address_balance(&client, &address);
                Balance {
                    address: address.to_string(),
                    balance: balance_res.confirmed,
                    unconfirmed_balance: balance_res.unconfirmed,
                }
            }).collect();

            println!("{}", serde_json::to_string_pretty(&json!({
                "statecoins": agg_result,
                "backup addresses": backup_result,
            })).unwrap());
        },
        Commands::BroadcastBackupTransaction { statechain_id } => {

            let txid = deposit::broadcast_backup_tx(&pool, &statechain_id).await;

            println!("{}", serde_json::to_string_pretty(&json!({
                "txid": txid,
            })).unwrap());
        },
        Commands::SendBackup { address, fee_rate } => {

            let to_address = bitcoin::Address::from_str(&address).unwrap().require_network(network).unwrap();

            let fee_rate = match fee_rate {
                Some(fee_rate) => fee_rate,
                None => {
                    let fee_rate_btc_per_kb = electrum::estimate_fee(&client, 1);
                    let fee_rate_sats_per_byte = (fee_rate_btc_per_kb * 100000.0) as u64;
                    fee_rate_sats_per_byte
                },
            };

            let (_, backup_addresses) = wallet::get_all_addresses(&pool, network).await;

            let mut list_unspent = Vec::<(ListUnspentRes, Address)>::new(); 

            for address in backup_addresses {
                let address_utxos = electrum::get_script_list_unspent(&client, &address);
                for utxo in address_utxos {
                    list_unspent.push((utxo, address.clone()));
                }
            }

            let list_utxo = send_backup::get_address_info(&pool, list_unspent).await;


            send_backup::send_all_funds(&list_utxo, &to_address, fee_rate);
        },
        Commands::NewTransferAddress { } => {
            let address_data = key_derivation::get_new_address(&pool, None, None, network).await;
            println!("{}", serde_json::to_string_pretty(&json!({
                "transfer_address": address_data.transfer_address,
            })).unwrap());
        },
        Commands::TransferSend { recipient_address, statechain_id } => {

            let (_, new_user_pubkey, new_auth_pubkey) = key_derivation::decode_transfer_address(&recipient_address).unwrap();
            println!("new_user_pubkey: {}", new_user_pubkey);
            println!("new_auth_pubkey: {}", new_auth_pubkey);


        }
    };

    pool.close().await;
}
