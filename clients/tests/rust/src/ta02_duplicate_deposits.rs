use std::{env, process::Command, thread, time::Duration};

use anyhow::{Result, Ok};
use mercuryrustlib::{client_config::ClientConfig, CoinStatus, Wallet};

use crate::{bitcoin_core, electrs};

async fn withdraw_flow(client_config: &ClientConfig, wallet1: &Wallet, wallet2: &Wallet)  -> Result<()> {

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
    let duplicated_coin = wallet1.coins.iter().find(|&coin| coin.aggregated_address == Some(deposit_address.clone()) && coin.status == CoinStatus::DUPLICATED);

    assert!(new_coin.is_some());
    assert!(duplicated_coin.is_some());

    let new_coin = new_coin.unwrap();
    let duplicated_coin = duplicated_coin.unwrap();

    assert!(new_coin.duplicate_index == 0);
    assert!(duplicated_coin.duplicate_index == 1);

    let statechain_id = new_coin.statechain_id.as_ref().unwrap();

    let wallet2_transfer_adress = mercuryrustlib::transfer_receiver::new_transfer_address(&client_config, &wallet2.name).await?;

    let batch_id = None;

    let force_send = false;

    let result = mercuryrustlib::transfer_sender::execute(&client_config, &wallet2_transfer_adress, &wallet1.name, statechain_id, force_send, None, batch_id.clone()).await;

    assert!(result.is_err());

    let error_msg = result.err().unwrap().to_string();

    assert!(error_msg == "Coin is duplicated. If you want to proceed, use the command '--force, -f' option. \
        You will no longer be able to move other duplicate coins with the same statechain_id and this will cause PERMANENT LOSS of these duplicate coin funds.");

    let fee_rate = None;

    let result = mercuryrustlib::withdraw::execute(&client_config, &wallet1.name, statechain_id, &core_wallet_address, fee_rate, Some(1)).await;

    assert!(result.is_ok());

    mercuryrustlib::coin_status::update_coins(&client_config, &wallet1.name).await?;

    let result = mercuryrustlib::transfer_sender::execute(&client_config, &wallet2_transfer_adress, &wallet1.name, statechain_id, force_send, None, batch_id).await;

    assert!(result.is_err());

    let error_msg = result.err().unwrap().to_string();

    assert!(error_msg == "There have been withdrawals of other coins with this same statechain_id (possibly duplicates).\
        This transfer cannot be performed because the recipient would reject it due to the difference in signature count.\
        This coin can be withdrawn, however.");

    let result = mercuryrustlib::withdraw::execute(&client_config, &wallet1.name, statechain_id, &core_wallet_address, fee_rate, None).await;

    assert!(result.is_ok());
    
    Ok(())
}

async fn transfer_flow(client_config: &ClientConfig, wallet1: &Wallet, wallet2: &Wallet)  -> Result<()> {

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
    let duplicated_coin = wallet1.coins.iter().find(|&coin| coin.aggregated_address == Some(deposit_address.clone()) && coin.status == CoinStatus::DUPLICATED);

    assert!(new_coin.is_some());
    assert!(duplicated_coin.is_some());

    let new_coin = new_coin.unwrap();
    let duplicated_coin = duplicated_coin.unwrap();

    assert!(new_coin.duplicate_index == 0);
    assert!(duplicated_coin.duplicate_index == 1);

    let statechain_id = new_coin.statechain_id.as_ref().unwrap();

    let wallet2_transfer_adress = mercuryrustlib::transfer_receiver::new_transfer_address(&client_config, &wallet2.name).await?;

    let batch_id = None;

    let force_send = true;

    let result = mercuryrustlib::transfer_sender::execute(&client_config, &wallet2_transfer_adress, &wallet1.name, statechain_id, force_send, None, batch_id.clone()).await;

    assert!(result.is_ok());
    
    let transfer_receive_result = mercuryrustlib::transfer_receiver::execute(&client_config, &wallet2.name).await?;
    let received_statechain_ids = transfer_receive_result.received_statechain_ids;

    assert!(received_statechain_ids.contains(&statechain_id.to_string()));
    assert!(received_statechain_ids.len() == 1);

    mercuryrustlib::coin_status::update_coins(&client_config, &wallet1.name).await?;
    let wallet1: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet1.name).await?;

    let transferred_coin = wallet1.coins.iter().find(|&coin| coin.aggregated_address == Some(deposit_address.clone()) && coin.status == CoinStatus::TRANSFERRED);
    let duplicated_coin = wallet1.coins.iter().find(|&coin| coin.aggregated_address == Some(deposit_address.clone()) && coin.status == CoinStatus::DUPLICATED);

    assert!(transferred_coin.is_some());
    assert!(duplicated_coin.is_some());

    let transferred_coin = transferred_coin.unwrap();
    let duplicated_coin = duplicated_coin.unwrap();

    assert!(transferred_coin.duplicate_index == 0);
    assert!(duplicated_coin.duplicate_index == 1);

    let fee_rate = None;

    let result = mercuryrustlib::withdraw::execute(&client_config, &wallet1.name, statechain_id, &core_wallet_address, fee_rate, Some(1)).await;

    assert!(result.is_err());

    let error_msg = result.err().unwrap().to_string();

    assert!(error_msg == "Signature does not match authentication key.");



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

    withdraw_flow(&client_config, &wallet1, &wallet2).await?;
    transfer_flow(&client_config, &wallet1, &wallet2).await?;

    println!("TA02 - Test \"Multiple Deposits in the Same Adress\" completed successfully");

    Ok(())
}