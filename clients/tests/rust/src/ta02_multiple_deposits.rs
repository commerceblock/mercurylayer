use std::{env, process::Command, thread, time::Duration};

use anyhow::{Result, Ok};
use mercuryrustlib::{client_config::ClientConfig, CoinStatus, Wallet};

use crate::{bitcoin_core, electrs};

async fn basic_workflow(client_config: &ClientConfig, wallet1: &Wallet, wallet2: &Wallet)  -> Result<()> {

    let amount = 1000;

    let token_id = mercuryrustlib::deposit::get_token(client_config).await?;

    let deposit_address = mercuryrustlib::deposit::get_deposit_bitcoin_address(&client_config, &wallet1.name, &token_id, amount).await?;

    let _ = bitcoin_core::sendtoaddress(amount, &deposit_address)?;

    let core_wallet_address = bitcoin_core::getnewaddress()?;
    let remaining_blocks = client_config.confirmation_target;
    let _ = bitcoin_core::generatetoaddress(remaining_blocks, &core_wallet_address)?;

    // It appears that Electrs takes a few seconds to index the transaction
    let mut is_tx_indexed = false;

    while !is_tx_indexed {
        is_tx_indexed = electrs::check_address(client_config, &deposit_address, amount).await?;
        thread::sleep(Duration::from_secs(1));
    }

    mercuryrustlib::coin_status::update_coins(&client_config, &wallet1.name).await?;
    let wallet: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet1.name).await?;
    let new_coin = wallet.coins.iter().find(|&coin| coin.aggregated_address == Some(deposit_address.clone())).unwrap();

    assert!(new_coin.status == CoinStatus::CONFIRMED);

    let amount = 2000;

    let _ = bitcoin_core::sendtoaddress(amount, &deposit_address)?;

    let _ = bitcoin_core::generatetoaddress(remaining_blocks, &core_wallet_address)?;

    let mut is_tx_indexed = false;

    while !is_tx_indexed {
        is_tx_indexed = electrs::check_address(client_config, &deposit_address, amount).await?;
        thread::sleep(Duration::from_secs(1));
    }

    mercuryrustlib::coin_status::update_coins(&client_config, &wallet1.name).await?;
    let wallet1: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet1.name).await?;

    let new_coin = wallet1.coins.iter().find(|&coin| coin.aggregated_address == Some(deposit_address.clone()) && coin.status == CoinStatus::CONFIRMED);
    let duplicated_coin = wallet1.coins.iter().find(|&coin| coin.aggregated_address == Some(deposit_address.clone()) && coin.status == CoinStatus::DUPLICATED_EXCLUDED);

    assert!(new_coin.is_some());
    assert!(duplicated_coin.is_some());

    let new_coin = new_coin.unwrap();
    let duplicated_coin = duplicated_coin.unwrap();

    assert!(new_coin.duplicate_index == 0);
    assert!(duplicated_coin.duplicate_index == 1);

    let statechain_id = new_coin.statechain_id.as_ref().unwrap();

    let wallet2_transfer_adress = mercuryrustlib::transfer_receiver::new_transfer_address(&client_config, &wallet2.name).await?;

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