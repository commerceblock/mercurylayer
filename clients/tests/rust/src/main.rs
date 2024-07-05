
pub mod electrs;
pub mod bitcoin_core;

use std::{env, process::Command, thread, time::Duration};

use anyhow::{anyhow, Result, Ok};
use mercuryrustlib::{client_config::ClientConfig, CoinStatus, Wallet};

async fn try_to_send_unconfirmed_coin(client_config: &ClientConfig, to_address: &str, wallet: &Wallet, statechain_id: &str, current_status: &str) -> Result<()> {

    let batch_id = None;

    let result = mercuryrustlib::transfer_sender::execute(&client_config, to_address, &wallet.name, &statechain_id, batch_id).await;

    assert!(result.is_err());

    let error = result.err().unwrap();

    let error_message = format!("Coin status must be CONFIRMED or IN_TRANSFER to transfer it. The current status is {}", current_status);

    assert!(error.to_string() == error_message);

    Ok(())
}

async fn sucessfully_transfer(client_config: &ClientConfig, wallet1: &Wallet, wallet2: &Wallet) -> Result<()> {

    let token_id = mercuryrustlib::deposit::get_token(client_config).await?;

    let amount = 1000;

    let address = mercuryrustlib::deposit::get_deposit_bitcoin_address(&client_config, &wallet1.name, &token_id, amount).await?;

    mercuryrustlib::coin_status::update_coins(&client_config, &wallet1.name).await?;

    let wallet: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet1.name).await?;

    // let mut coins_json = Vec::new();

    // for coin in wallet.coins.iter() {
    //     let obj = json!({
    //         "coin.user_pubkey": coin.user_pubkey,
    //         "coin.aggregated_address": coin.aggregated_address.as_ref().unwrap_or(&"".to_string()),
    //         "coin.address": coin.address,
    //         "coin.statechain_id": coin.statechain_id.as_ref().unwrap_or(&"".to_string()),
    //         "coin.amount": coin.amount.unwrap_or(0),
    //         "coin.status": coin.status,
    //         "coin.locktime": coin.locktime.unwrap_or(0),
    //     });

    //     coins_json.push(obj);
    // }

    // let coins_json_string = serde_json::to_string_pretty(&coins_json).unwrap();
    // println!("{}", coins_json_string);

    let new_coin = wallet.coins.iter().find(|&coin| coin.aggregated_address == Some(address.clone()));

    if new_coin.is_none() {
        return Err(anyhow!("Coin not found in wallet"));
    }

    let new_coin = new_coin.unwrap();

    assert!(new_coin.status == CoinStatus::INITIALISED);
    assert!(new_coin.amount == Some(amount));
    assert!(new_coin.statechain_id.is_some());

    let _ = bitcoin_core::sendtoaddress(amount, &address)?;

    // It appears that Electrs takes a few seconds to index the transaction
    println!("Waiting for Electrs to index deposit transaction...");
    let mut is_tx_indexed = false;

    while !is_tx_indexed {
        is_tx_indexed = electrs::check_address(client_config, &address, amount).await?;
        thread::sleep(Duration::from_secs(1));
    }

    mercuryrustlib::coin_status::update_coins(&client_config, &wallet1.name).await?;

    let wallet: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet1.name).await?;

    let new_coin = wallet.coins.iter().find(|&coin| coin.aggregated_address == Some(address.clone())).unwrap();

    assert!(new_coin.status == CoinStatus::IN_MEMPOOL);

    let wallet2_transfer_adress = mercuryrustlib::transfer_receiver::new_transfer_address(&client_config, &wallet2.name).await?;

    let statechain_id = new_coin.statechain_id.as_ref().unwrap();

    try_to_send_unconfirmed_coin(&client_config, &wallet2_transfer_adress, &wallet1, statechain_id, &CoinStatus::IN_MEMPOOL.to_string()).await?;

    let core_wallet_address = bitcoin_core::getnewaddress()?;
    let _ = bitcoin_core::generatetoaddress(1, &core_wallet_address)?;

    mercuryrustlib::coin_status::update_coins(&client_config, &wallet1.name).await?;

    let wallet: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet1.name).await?;

    let new_coin = wallet.coins.iter().find(|&coin| coin.aggregated_address == Some(address.clone())).unwrap();

    assert!(new_coin.status == CoinStatus::UNCONFIRMED);

    try_to_send_unconfirmed_coin(&client_config, &wallet2_transfer_adress, &wallet1, statechain_id, &CoinStatus::UNCONFIRMED.to_string()).await?;

    let remaining_blocks = client_config.confirmation_target - 1;
    let _ = bitcoin_core::generatetoaddress(remaining_blocks, &core_wallet_address)?;

    mercuryrustlib::coin_status::update_coins(&client_config, &wallet1.name).await?;

    let wallet: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet1.name).await?;

    let new_coin = wallet.coins.iter().find(|&coin| coin.aggregated_address == Some(address.clone())).unwrap();

    assert!(new_coin.status == CoinStatus::CONFIRMED);

    let batch_id = None;

    let result = mercuryrustlib::transfer_sender::execute(&client_config, &wallet2_transfer_adress, &wallet.name, &statechain_id, batch_id).await;

    assert!(result.is_ok());

    mercuryrustlib::coin_status::update_coins(&client_config, &wallet1.name).await?;

    let wallet: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet1.name).await?;

    let new_coin = wallet.coins.iter().find(|&coin| coin.aggregated_address == Some(address.clone())).unwrap();

    assert!(new_coin.status == CoinStatus::IN_TRANSFER);

    let received_statechain_ids = mercuryrustlib::transfer_receiver::execute(&client_config, &wallet2.name).await?;

    assert!(received_statechain_ids.contains(&statechain_id.to_string()));
    assert!(received_statechain_ids.len() == 1);

    mercuryrustlib::coin_status::update_coins(&client_config, &wallet1.name).await?;
    let wallet: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet1.name).await?;
    let new_coin = wallet.coins.iter().find(|&coin| coin.aggregated_address == Some(address.clone())).unwrap();

    assert!(new_coin.status == CoinStatus::TRANSFERRED);

    mercuryrustlib::coin_status::update_coins(&client_config, &wallet2.name).await?;
    let local_wallet_2: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet2.name).await?;
    let new_coin = local_wallet_2.coins.iter().find(|&coin| coin.aggregated_address == Some(address.clone())).unwrap();

    assert!(new_coin.status == CoinStatus::CONFIRMED);

    let fee_rate = None;

    let result = mercuryrustlib::withdraw::execute(&client_config, &wallet2.name, &statechain_id, &core_wallet_address, fee_rate).await;

    assert!(result.is_ok());

    mercuryrustlib::coin_status::update_coins(&client_config, &wallet2.name).await?;
    let local_wallet_2: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet2.name).await?;
    let new_coin = local_wallet_2.coins.iter().find(|&coin| coin.aggregated_address == Some(address.clone())).unwrap();

    assert!(new_coin.status == CoinStatus::WITHDRAWING);

    let _ = bitcoin_core::generatetoaddress(client_config.confirmation_target, &core_wallet_address)?;

    mercuryrustlib::coin_status::update_coins(&client_config, &wallet2.name).await?;
    let local_wallet_2: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet2.name).await?;
    let new_coin = local_wallet_2.coins.iter().find(|&coin| coin.aggregated_address == Some(address.clone())).unwrap();

    assert!(new_coin.status == CoinStatus::WITHDRAWN);

    println!("T01 - Transfer completed successfully");

    Ok(())
}

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> {

    let _ = Command::new("rm").arg("wallet.db").arg("wallet.db-shm").arg("wallet.db-wal").output().expect("failed to execute process");

    env::set_var("ML_NETWORK", "regtest");

    let client_config = mercuryrustlib::client_config::load().await;

    println!("client_config.electrum_server_url: {}", client_config.electrum_server_url);
    println!("client_config.statechain_entity: {}", client_config.statechain_entity);

    let wallet1 = mercuryrustlib::wallet::create_wallet(
        "wallet1", 
        &client_config).await?;

    mercuryrustlib::sqlite_manager::insert_wallet(&client_config.pool, &wallet1).await?;

    let wallet2 = mercuryrustlib::wallet::create_wallet(
        "wallet2", 
        &client_config).await?;

    mercuryrustlib::sqlite_manager::insert_wallet(&client_config.pool, &wallet2).await?;

    sucessfully_transfer(&client_config, &wallet1, &wallet2).await?;

    Ok(())
}
