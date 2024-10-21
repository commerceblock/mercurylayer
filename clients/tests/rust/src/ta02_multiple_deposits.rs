use std::{env, process::Command, thread, time::Duration};

use anyhow::{Result, Ok};
use mercuryrustlib::{client_config::ClientConfig, CoinStatus, Wallet};
use serde_json::json;

use crate::{bitcoin_core, electrs};

async fn deposit(amount_in_sats: u32, client_config: &ClientConfig, deposit_address: &str) -> Result<()> {

    let _ = bitcoin_core::sendtoaddress(amount_in_sats, &deposit_address)?;

    let core_wallet_address = bitcoin_core::getnewaddress()?;
    let remaining_blocks = client_config.confirmation_target;
    let _ = bitcoin_core::generatetoaddress(remaining_blocks, &core_wallet_address)?;

    // It appears that Electrs takes a few seconds to index the transaction
    let mut is_tx_indexed = false;

    while !is_tx_indexed {
        is_tx_indexed = electrs::check_address(client_config, &deposit_address, 1000).await?;
        thread::sleep(Duration::from_secs(1));
    }

    Ok(())
}

async fn basic_workflow(client_config: &ClientConfig, wallet1: &Wallet, wallet2: &Wallet)  -> Result<()> {

    let amount = 1000;

    let token_id = mercuryrustlib::deposit::get_token(client_config).await?;

    let deposit_address = mercuryrustlib::deposit::get_deposit_bitcoin_address(&client_config, &wallet1.name, &token_id, amount).await?;

    deposit(amount, &client_config, &deposit_address).await?;

    let amount = 2000;

    deposit(amount, &client_config, &deposit_address).await?;

    deposit(amount, &client_config, &deposit_address).await?;

    mercuryrustlib::coin_status::update_coins(&client_config, &wallet1.name).await?;
    let wallet1: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet1.name).await?;

    let new_coin = wallet1.coins.iter().find(|&coin| coin.aggregated_address == Some(deposit_address.clone()) && coin.duplicate_index == 0 && coin.status == CoinStatus::CONFIRMED);
    let duplicated_coin_1 = wallet1.coins.iter().find(|&coin| coin.aggregated_address == Some(deposit_address.clone()) && coin.duplicate_index == 1 && coin.status == CoinStatus::DUPLICATED_EXCLUDED);
    let duplicated_coin_2 = wallet1.coins.iter().find(|&coin| coin.aggregated_address == Some(deposit_address.clone()) && coin.duplicate_index == 2 && coin.status == CoinStatus::DUPLICATED_EXCLUDED);

    assert!(new_coin.is_some());
    assert!(duplicated_coin_1.is_some());

    let new_coin = new_coin.unwrap();
    let duplicated_coin_1 = duplicated_coin_1.unwrap();
    let duplicated_coin_2 = duplicated_coin_2.unwrap();

    assert!(new_coin.duplicate_index == 0);
    assert!(duplicated_coin_1.duplicate_index == 1);
    assert!(duplicated_coin_2.duplicate_index == 2);

    mercuryrustlib::transfer_sender::include_duplicated_utxo(&client_config, &deposit_address, &wallet1.name, &new_coin.statechain_id.as_ref().unwrap(), 1, &vec![]).await?;

    let wallet1: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet1.name).await?;

    for coin in wallet1.coins.iter() {
        if coin.statechain_id == new_coin.statechain_id && coin.duplicate_index == 1 {
            assert!(coin.status == CoinStatus::DUPLICATED_INCLUDED);
        }

        if coin.statechain_id == new_coin.statechain_id && coin.duplicate_index == 2 {
            assert!(coin.status == CoinStatus::DUPLICATED_EXCLUDED);
        }
    }

    /* let mut coins_json = Vec::new();

    for coin in wallet1.coins.iter() {
        let obj = json!({
            "coin.user_pubkey": coin.user_pubkey,
            "coin.aggregated_address": coin.aggregated_address.as_ref().unwrap_or(&"".to_string()),
            "coin.address": coin.address,
            "coin.statechain_id": coin.statechain_id.as_ref().unwrap_or(&"".to_string()),
            "coin.amount": coin.amount.unwrap_or(0),
            "coin.status": coin.status,
            "coin.locktime": coin.locktime.unwrap_or(0),
            "coin.duplicate_index": coin.duplicate_index,
        });

        coins_json.push(obj);
    }

    let coins_json_string = serde_json::to_string_pretty(&coins_json).unwrap();
    println!("{}", coins_json_string); */

    // let statechain_id = new_coin.statechain_id.as_ref().unwrap();

    // let wallet2_transfer_adress = mercuryrustlib::transfer_receiver::new_transfer_address(&client_config, &wallet2.name).await?;

    Ok(())
}

pub async fn execute() -> Result<()> {

    let _ = Command::new("rm").arg("wallet.db").arg("wallet.db-shm").arg("wallet.db-wal").output().expect("failed to execute process");

    env::set_var("ML_NETWORK", "regtest");

    let client_config = mercuryrustlib::client_config::load().await;

    let wallet1 = mercuryrustlib::wallet::create_wallet(
        "wallet1", 
        &client_config).await?;

    mercuryrustlib::sqlite_manager::insert_wallet(&client_config.pool, &wallet1).await?;

    let wallet2 = mercuryrustlib::wallet::create_wallet(
        "wallet2", 
        &client_config).await?;

    mercuryrustlib::sqlite_manager::insert_wallet(&client_config.pool, &wallet2).await?;

    basic_workflow(&client_config, &wallet1, &wallet2).await?;

    println!("TA02 - Test \"Multiple Deposits in the Same Adress\" completed successfully");

    Ok(())
}