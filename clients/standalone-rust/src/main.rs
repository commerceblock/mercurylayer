mod deposit;
mod key_derivation;
mod error;
mod electrum;
mod wallet;
mod transaction;
mod send_backup;
mod transfer_sender;
mod transfer_receiver;
mod utils;
mod client_config;
mod withdraw;

use std::{str::FromStr, fs::File, io::Write};

use bitcoin::Address;
use clap::{Parser, Subcommand};
use client_config::ClientConfig;
use electrum_client::ListUnspentRes;
use serde::{Serialize, Deserialize};
use serde_json::json;

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
    TransferSend { recipient_address: String, statechain_id: String },
    /// Retrieve coins from server
    TransferReceive { },
    /// Withdraw funds from a statechain coin to a bitcoin address
    Withdraw { recipient_address: String, statechain_id: String, fee_rate: Option<u64> },
    /// Export wallet to JSON
    ExportWallet { },
}

#[tokio::main(flavor = "current_thread")]
async fn main() {

    let cli = Cli::parse();

    let client_config = ClientConfig::load().await;

    match cli.command {
        Commands::ShowMnemonic { } => {
            let (mnemonic, _) = key_derivation::get_mnemonic_and_block_height(&client_config).await;
            println!("{}", serde_json::to_string_pretty(&json!({
                "mnemonic": mnemonic,
            })).unwrap());
        },
        Commands::Deposit { token_id, amount } => {
            let token_id = uuid::Uuid::parse_str(&token_id).unwrap();
            let statechain_id = deposit::execute(&client_config, token_id, amount).await.unwrap();
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

            let (agg_addresses, backup_addresses) = wallet::get_all_addresses(&client_config).await;

            let agg_result: Vec<Balance> = agg_addresses.iter().map(|address| {
                let balance_res = electrum::get_address_balance(&client_config.electrum_client, &address);
                Balance {
                    address: address.to_string(),
                    balance: balance_res.confirmed,
                    unconfirmed_balance: balance_res.unconfirmed,
                }
            }).collect();

            let backup_result: Vec<Balance> = backup_addresses.iter().map(|address| {
                let balance_res = electrum::get_address_balance(&client_config.electrum_client, &address);
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

            let txid = deposit::broadcast_backup_tx(&client_config, &statechain_id).await;

            println!("{}", serde_json::to_string_pretty(&json!({
                "txid": txid,
            })).unwrap());
        },
        Commands::SendBackup { address, fee_rate } => {

            let to_address = bitcoin::Address::from_str(&address).unwrap().require_network(client_config.network).unwrap();

            let fee_rate = match fee_rate {
                Some(fee_rate) => fee_rate,
                None => {
                    let fee_rate_btc_per_kb = electrum::estimate_fee(&client_config.electrum_client, 1);
                    let fee_rate_sats_per_byte = (fee_rate_btc_per_kb * 100000.0) as u64;
                    fee_rate_sats_per_byte
                },
            };

            let (_, backup_addresses) = wallet::get_all_addresses(&client_config).await;

            let mut list_unspent = Vec::<(ListUnspentRes, Address)>::new(); 

            for address in backup_addresses {
                let address_utxos = electrum::get_script_list_unspent(&client_config.electrum_client, &address);
                for utxo in address_utxos {
                    list_unspent.push((utxo, address.clone()));
                }
            }

            if list_unspent.len() == 0 {
                println!("No backup funds to send");
                return;
            }

            let list_utxo = send_backup::get_address_info(&client_config.pool, list_unspent).await;


            send_backup::send_all_funds(&list_utxo, &to_address, fee_rate, &client_config.electrum_client);
        },
        Commands::NewTransferAddress { } => {
            let address_data = key_derivation::get_new_address(&client_config).await;
            println!("{}", serde_json::to_string_pretty(&json!({
                "transfer_address": address_data.transfer_address,
            })).unwrap());
        },
        Commands::TransferSend { recipient_address, statechain_id } => {

            transfer_sender::init(&client_config, &recipient_address, &statechain_id).await.unwrap();

            println!("{}", serde_json::to_string_pretty(&json!({
                "sent": true,
            })).unwrap());


        },
        Commands::TransferReceive { } => {
            transfer_receiver::receive( &client_config).await;
        },
        Commands::Withdraw { recipient_address, statechain_id, fee_rate } => {
                
                let to_address = bitcoin::Address::from_str(&recipient_address).unwrap().require_network(client_config.network).unwrap();
    
                let fee_rate = match fee_rate {
                    Some(fee_rate) => fee_rate,
                    None => {
                        let fee_rate_btc_per_kb = electrum::estimate_fee(&client_config.electrum_client, 1);
                        let fee_rate_sats_per_byte = (fee_rate_btc_per_kb * 100000.0) as u64;
                        fee_rate_sats_per_byte
                    },
                };

                let txid = withdraw::execute(&client_config, &statechain_id, &to_address, fee_rate).await.unwrap();
    
                println!("{}", serde_json::to_string_pretty(&json!({
                    "txid": txid,
                })).unwrap());
        },
        Commands::ExportWallet {  } => {
            let (mnemonic, block_height) = key_derivation::get_mnemonic_and_block_height(&client_config).await;
            
            let coins = wallet::get_coins(&client_config).await;

            let state_entity_endpoint = client_config.statechain_entity.clone();
            let electrum_endpoint = client_config.electrum_server_url.clone();

            let wallet_json = serde_json::to_string_pretty(&json!({
                "wallet": {
                    "name": "default",
                    "network": client_config.network.to_string(),
                    "mnemonic": mnemonic,
                    "version": 0.1,
                    "state_entity_endpoint": state_entity_endpoint,
                    "electrum_endpoint": electrum_endpoint,
                    "blockheight": block_height,
                    "coins": coins,
                }
            })).unwrap();
            println!("{}", wallet_json);

            let mut file = File::create("wallet.json").unwrap();
            file.write_all(wallet_json.as_bytes()).unwrap();
            println!("JSON written to output.json");
        },
    };

    client_config.pool.close().await;
}
