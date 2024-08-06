use std::{thread, time::Duration};

use anyhow::Result;
use clap::{Parser, Subcommand};
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
    /// Create a wallet
    CreateWallet { 
        /// The name of the wallet to create
        name: String 
    },
    /// Get new token.
    NewToken { },
    /// Get new deposit address. Used to fund a new statecoin.
    NewDepositAddress { wallet_name: String, token_id: String, amount: u32 },
    /// Broadcast the backup transaction to the network
    BroadcastBackupTransaction { 
        wallet_name: String,
        statechain_id: String,
        to_address: String,
        /// Transaction fee rate in sats per byte
        fee_rate: Option<f64>
    },
    /// Broadcast the backup transaction to the network
    ListStatecoins { wallet_name: String },
    /// Withdraw funds from a statechain coin to a bitcoin address
    Withdraw { 
        wallet_name: String, 
        statechain_id: String, 
        to_address: String, 
        /// Transaction fee rate in sats per byte
        fee_rate: Option<f64>,
        duplicated_index: Option<u32>
    },
    /// Generate a transfer address to receive funds
    NewTransferAddress { 
        wallet_name: String,
        /// Generate batch id for atomic transfers
        #[arg(short='b', long)]
        generate_batch_id: bool,
    },
    /// Send a statechain coin to a transfer address
    TransferSend {
        wallet_name: String, 
        statechain_id: String, 
        to_address: String,
        // Force send (required when the coin is duplicated)
        force_send: Option<bool>,
        /// Batch id for atomic transfers
        batch_id: Option<String>,
    },
    /// Send a statechain coin to a transfer address
    TransferReceive { wallet_name: String },
    /// Create a payment hash for a lightning latch
    PaymentHash {
        wallet_name: String, 
        statechain_id: String, 
    },
    /// Confirm pending invoice
    ConfirmPendingInvoice {
        wallet_name: String, 
        statechain_id: String,
    },
    /// Retrieve a payment pre-image for a lightning latch
    RetrievePreImage {
        wallet_name: String, 
        statechain_id: String,
        batch_id: String,
    },
    /// Get the payment hash by batch id
    GetPaymentHash {
        batch_id: String,
    }
}

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> {
    
    let cli = Cli::parse();

    let client_config = mercuryrustlib::client_config::load().await;

    match cli.command {
        Commands::CreateWallet { name } => {
            let wallet = mercuryrustlib::wallet::create_wallet(
                &name, 
                &client_config).await?;

            mercuryrustlib::sqlite_manager::insert_wallet(&client_config.pool, &wallet).await?;
            println!("Wallet created: {:?}", wallet);
        },
        Commands::NewToken { } => {
            let token_id = mercuryrustlib::deposit::get_token(&client_config).await?;

            let obj = json!({"token": token_id});

            println!("{}", serde_json::to_string_pretty(&obj).unwrap());
        },
        Commands::NewDepositAddress { wallet_name, token_id, amount } => {
            let address = mercuryrustlib::deposit::get_deposit_bitcoin_address(&client_config, &wallet_name, &token_id, amount).await?;

            let obj = json!({"address": address});

            println!("{}", serde_json::to_string_pretty(&obj).unwrap());
        },
        Commands::BroadcastBackupTransaction { wallet_name, statechain_id, to_address, fee_rate } => {
            mercuryrustlib::coin_status::update_coins(&client_config, &wallet_name).await?;
            mercuryrustlib::broadcast_backup_tx::execute(&client_config, &wallet_name, &statechain_id, &to_address, fee_rate).await?;
        },
        Commands::ListStatecoins { wallet_name } => {
            mercuryrustlib::coin_status::update_coins(&client_config, &wallet_name).await?;
            let wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet_name).await?;

            let mut coins_json = Vec::new();
        
            for coin in wallet.coins.iter() {
                let obj = json!({
                    "coin.user_pubkey": coin.user_pubkey,
                    "coin.aggregated_address": coin.aggregated_address.as_ref().unwrap_or(&"".to_string()),
                    "coin.address": coin.address,
                    "coin.statechain_id": coin.statechain_id.as_ref().unwrap_or(&"".to_string()),
                    "coin.amount": coin.amount.unwrap_or(0),
                    "coin.status": coin.status,
                    "coin.locktime": coin.locktime.unwrap_or(0),
                });

                coins_json.push(obj);
            }

            let coins_json_string = serde_json::to_string_pretty(&coins_json).unwrap();
            println!("{}", coins_json_string);
        },
        Commands::Withdraw { wallet_name, statechain_id, to_address, fee_rate, duplicated_index } => {
            mercuryrustlib::coin_status::update_coins(&client_config, &wallet_name).await?;
            mercuryrustlib::withdraw::execute(&client_config, &wallet_name, &statechain_id, &to_address, fee_rate, duplicated_index).await?;
        },
        Commands::NewTransferAddress { wallet_name, generate_batch_id } => {
            let address = mercuryrustlib::transfer_receiver::new_transfer_address(&client_config, &wallet_name).await?;

            let mut obj = json!({"new_transfer_address:": address});

            if generate_batch_id {
                // Generate a random batch_id
                let batch_id = Some(uuid::Uuid::new_v4().to_string()).unwrap();

                obj["batch_id"] = json!(batch_id);
            }

            println!("{}", serde_json::to_string_pretty(&obj).unwrap());
        },
        Commands::TransferSend { wallet_name, statechain_id, to_address, force_send, batch_id } => {
            mercuryrustlib::coin_status::update_coins(&client_config, &wallet_name).await?;

            let force_send = force_send.unwrap_or(false);

            mercuryrustlib::transfer_sender::execute(&client_config, &to_address, &wallet_name, &statechain_id, force_send, batch_id).await?;

            let obj = json!({"Transfer": "sent"});

            println!("{}", serde_json::to_string_pretty(&obj).unwrap());
        },
        Commands::TransferReceive { wallet_name } => {
            mercuryrustlib::coin_status::update_coins(&client_config, &wallet_name).await?;

            let mut received_statechain_ids = Vec::<String>::new();

            loop {
                let transfer_receive_result = mercuryrustlib::transfer_receiver::execute(&client_config, &wallet_name).await?;
                received_statechain_ids.extend(transfer_receive_result.received_statechain_ids);

                if transfer_receive_result.is_there_batch_locked {
                    println!("Statecoin batch still locked. Waiting until expiration or unlock.");
                    thread::sleep(Duration::from_secs(5));
                } else {
                    break;
                }
            }

            let obj = json!(received_statechain_ids);

            println!("{}", serde_json::to_string_pretty(&obj).unwrap());
        },
        Commands::PaymentHash { wallet_name, statechain_id} => {
            let response = mercuryrustlib::lightning_latch::create_pre_image(&client_config, &wallet_name, &statechain_id).await?;

            let obj = json!(response);

            println!("{}", serde_json::to_string_pretty(&obj).unwrap());
        },
        Commands::ConfirmPendingInvoice { wallet_name, statechain_id } => {
            mercuryrustlib::lightning_latch::confirm_pending_invoice(&client_config, &wallet_name, &statechain_id).await?;
        },
        Commands::RetrievePreImage { wallet_name, statechain_id, batch_id } => {

            let pre_image = mercuryrustlib::lightning_latch::retrieve_pre_image(&client_config, &wallet_name, &statechain_id, &batch_id).await?;

            let obj = json!({"pre_image": pre_image});

            println!("{}", serde_json::to_string_pretty(&obj).unwrap());
        },
        Commands::GetPaymentHash { batch_id } => {
            let payment_hash = mercuryrustlib::lightning_latch::get_payment_hash(&client_config, &batch_id).await?;

            let obj = json!({"payment_hash": payment_hash});

            println!("{}", serde_json::to_string_pretty(&obj).unwrap());
        }
    }

    client_config.pool.close().await;

    Ok(())
}
