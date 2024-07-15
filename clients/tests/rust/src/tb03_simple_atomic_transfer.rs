use std::{env, process::Command, thread, time::Duration};
use anyhow::{Result, Ok};
use mercuryrustlib::{client_config::ClientConfig, CoinStatus, Wallet};

use crate::{bitcoin_core, electrs};

pub async fn tb03(client_config: &ClientConfig, wallet1: &Wallet, wallet2: &Wallet, wallet3: &Wallet, wallet4: &Wallet) -> Result<()> {

    let amount = 1000;

    // Create first deposit address

    let token_id = mercuryrustlib::deposit::get_token(client_config).await?;

    let wallet1_address = mercuryrustlib::deposit::get_deposit_bitcoin_address(&client_config, &wallet1.name, &token_id, amount).await?;

    let _ = bitcoin_core::sendtoaddress(amount, &wallet1_address)?;

    let token_id = mercuryrustlib::deposit::get_token(client_config).await?;

    let wallet2_address = mercuryrustlib::deposit::get_deposit_bitcoin_address(&client_config, &wallet2.name, &token_id, amount).await?;

    let _ = bitcoin_core::sendtoaddress(amount, &wallet2_address)?;

    let core_wallet_address = bitcoin_core::getnewaddress()?;
    let remaining_blocks = client_config.confirmation_target;
    let _ = bitcoin_core::generatetoaddress(remaining_blocks, &core_wallet_address)?;

    // It appears that Electrs takes a few seconds to index the transaction
    let mut is_tx_indexed = false;

    while !is_tx_indexed {
        let addr1_ok = electrs::check_address(client_config, &wallet1_address, amount).await?;
        let addr2_ok = electrs::check_address(client_config, &wallet2_address, amount).await?;
        is_tx_indexed = addr1_ok && addr2_ok;
        thread::sleep(Duration::from_secs(1));
    }

    let batch_id = Some(uuid::Uuid::new_v4().to_string());

    let wallet3_transfer_adress = mercuryrustlib::transfer_receiver::new_transfer_address(&client_config, &wallet3.name).await?;
    let wallet4_transfer_adress = mercuryrustlib::transfer_receiver::new_transfer_address(&client_config, &wallet4.name).await?;

    mercuryrustlib::coin_status::update_coins(&client_config, &wallet1.name).await?;
    let wallet1: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet1.name).await?;
    let new_coin = wallet1.coins.iter().find(|&coin| coin.aggregated_address == Some(wallet1_address.clone()) && coin.status == CoinStatus::CONFIRMED).unwrap();
    let statechain_id_1 = new_coin.statechain_id.as_ref().unwrap();

    let result = mercuryrustlib::transfer_sender::execute(&client_config, &wallet3_transfer_adress, &wallet1.name, &statechain_id_1, batch_id.clone()).await;

    assert!(result.is_ok());

    mercuryrustlib::coin_status::update_coins(&client_config, &wallet2.name).await?;
    let wallet2: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet2.name).await?;
    let new_coin = wallet2.coins.iter().find(|&coin| coin.aggregated_address == Some(wallet2_address.clone()) && coin.status == CoinStatus::CONFIRMED).unwrap();
    let statechain_id_2 = new_coin.statechain_id.as_ref().unwrap();

    let result = mercuryrustlib::transfer_sender::execute(&client_config, &wallet4_transfer_adress, &wallet2.name, &statechain_id_2, batch_id).await;

    assert!(result.is_ok());

    let transfer_receive_result = mercuryrustlib::transfer_receiver::execute(&client_config, &wallet3.name).await?;

    assert!(transfer_receive_result.is_there_batch_locked);
    assert!(transfer_receive_result.received_statechain_ids.len() == 0);

    let transfer_receive_result = mercuryrustlib::transfer_receiver::execute(&client_config, &wallet4.name).await?;

    assert!(!transfer_receive_result.is_there_batch_locked);
    assert!(transfer_receive_result.received_statechain_ids.len() == 1);
    assert!(transfer_receive_result.received_statechain_ids[0] == statechain_id_2.to_string());

    let wallet4: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet4.name).await?;
    let new_coin = wallet4.coins.iter().find(|&coin| coin.statechain_id == Some(statechain_id_2.clone())).unwrap();
    assert!(new_coin.status == CoinStatus::CONFIRMED);

    let transfer_receive_result = mercuryrustlib::transfer_receiver::execute(&client_config, &wallet3.name).await?;

    assert!(!transfer_receive_result.is_there_batch_locked);
    assert!(transfer_receive_result.received_statechain_ids.len() == 1);
    assert!(transfer_receive_result.received_statechain_ids[0] == statechain_id_1.to_string());

    let wallet3: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet3.name).await?;
    let new_coin = wallet3.coins.iter().find(|&coin| coin.statechain_id == Some(statechain_id_1.clone())).unwrap();
    assert!(new_coin.status == CoinStatus::CONFIRMED);

    mercuryrustlib::coin_status::update_coins(&client_config, &wallet1.name).await?;
    let wallet1: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet1.name).await?;
    let new_coin = wallet1.coins.iter().find(|&coin| coin.aggregated_address == Some(wallet1_address.clone())).unwrap();
    assert!(new_coin.status == CoinStatus::TRANSFERRED);

    mercuryrustlib::coin_status::update_coins(&client_config, &wallet2.name).await?;
    let wallet2: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet2.name).await?;
    let new_coin = wallet2.coins.iter().find(|&coin| coin.aggregated_address == Some(wallet2_address.clone())).unwrap();
    assert!(new_coin.status == CoinStatus::TRANSFERRED);

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

    let wallet3 = mercuryrustlib::wallet::create_wallet(
        "wallet3", 
        &client_config).await?;

    mercuryrustlib::sqlite_manager::insert_wallet(&client_config.pool, &wallet3).await?;

    let wallet4 = mercuryrustlib::wallet::create_wallet(
        "wallet4", 
        &client_config).await?;

    mercuryrustlib::sqlite_manager::insert_wallet(&client_config.pool, &wallet4).await?;

    tb03(&client_config, &wallet1, &wallet2, &wallet3, &wallet4).await?;

    println!("TB03- Simple Atomic Transfer Test completed successfully");

    Ok(())
}