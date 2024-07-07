use std::{env, process::Command, thread, time::Duration};
use anyhow::{Result, Ok};
use mercuryrustlib::{client_config::ClientConfig, CoinStatus, Wallet};

use crate::{bitcoin_core, electrs};


async fn tb02(client_config: &ClientConfig, wallet1: &Wallet, wallet2: &Wallet) -> Result<()> {

    let amount = 1000;

    // Create first deposit address

    let token_id = mercuryrustlib::deposit::get_token(client_config).await?;

    let address = mercuryrustlib::deposit::get_deposit_bitcoin_address(&client_config, &wallet1.name, &token_id, amount).await?;

    let _ = bitcoin_core::sendtoaddress(amount, &address)?;

    // Create second deposit address

    let token_id = mercuryrustlib::deposit::get_token(client_config).await?;

    let address = mercuryrustlib::deposit::get_deposit_bitcoin_address(&client_config, &wallet1.name, &token_id, amount).await?;

    let _ = bitcoin_core::sendtoaddress(amount, &address)?;

    let core_wallet_address = bitcoin_core::getnewaddress()?;
    let remaining_blocks = client_config.confirmation_target;
    let _ = bitcoin_core::generatetoaddress(remaining_blocks, &core_wallet_address)?;

    // It appears that Electrs takes a few seconds to index the transaction
    let mut is_tx_indexed = false;

    while !is_tx_indexed {
        is_tx_indexed = electrs::check_address(client_config, &address, amount).await?;
        thread::sleep(Duration::from_secs(1));
    }

    mercuryrustlib::coin_status::update_coins(&client_config, &wallet1.name).await?;

    let wallet1: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet1.name).await?;

    assert!(wallet1.coins.len() == 2);

    for coin in wallet1.coins.iter() {
        assert!(coin.status == CoinStatus::CONFIRMED);
    }

    let wallet2_transfer_adress = mercuryrustlib::transfer_receiver::new_transfer_address(&client_config, &wallet2.name).await?;

    for coin in wallet1.coins.iter() {
        let batch_id = None;

        let statechain_id = coin.statechain_id.as_ref().unwrap();

        let result = mercuryrustlib::transfer_sender::execute(&client_config, &wallet2_transfer_adress, &wallet1.name, &statechain_id, batch_id).await;

        assert!(result.is_ok());
    }

    let received_statechain_ids = mercuryrustlib::transfer_receiver::execute(&client_config, &wallet2.name).await?;

    let wallet2: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet2.name).await?;

    assert!(wallet2.coins.len() == 2);

    for coin in wallet2.coins.iter() {
        assert!(coin.status == CoinStatus::CONFIRMED);
        assert!(received_statechain_ids.contains(&coin.statechain_id.as_ref().unwrap().clone()));
    }

    for i in 0..wallet2.coins.len() {
        for j in (i + 1)..wallet2.coins.len() {
            assert_eq!(wallet2.coins[i].user_privkey, wallet2.coins[j].user_privkey, "user_privkey mismatch");
            assert_eq!(wallet2.coins[i].auth_privkey, wallet2.coins[j].auth_privkey, "auth_privkey mismatch");
            assert_eq!(wallet2.coins[i].address, wallet2.coins[j].address, "address mismatch");

            assert_ne!(wallet2.coins[i].server_pubkey, wallet2.coins[j].server_pubkey, "server_pubkey should differ");
            assert_ne!(wallet2.coins[i].statechain_id, wallet2.coins[j].statechain_id, "statechain_id should differ");
            assert_ne!(wallet2.coins[i].aggregated_address, wallet2.coins[j].aggregated_address, "aggregated_address should differ");
        }
    }

    let statechain_id = wallet2.coins[0].statechain_id.as_ref().unwrap().clone();

    let fee_rate = None;

    let result = mercuryrustlib::withdraw::execute(&client_config, &wallet2.name, &statechain_id, &core_wallet_address, fee_rate).await;

    assert!(result.is_ok());

    let wallet2: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet2.name).await?;

    assert!(wallet2.coins[0].status == CoinStatus::WITHDRAWING);

    let _ = bitcoin_core::generatetoaddress(client_config.confirmation_target, &core_wallet_address)?;

    mercuryrustlib::coin_status::update_coins(&client_config, &wallet2.name).await?;
    let wallet2: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet2.name).await?;

    assert!(wallet2.coins[0].status == CoinStatus::WITHDRAWN);

    let wallet1_transfer_adress = mercuryrustlib::transfer_receiver::new_transfer_address(&client_config, &wallet1.name).await?;

    let batch_id = None;

    let statechain_id = wallet2.coins[1].statechain_id.as_ref().unwrap().clone();

    let result = mercuryrustlib::transfer_sender::execute(&client_config, &wallet1_transfer_adress, &wallet2.name, &statechain_id, batch_id).await;

    assert!(result.is_ok());

    let received_statechain_ids = mercuryrustlib::transfer_receiver::execute(&client_config, &wallet1.name).await?;

    assert!(received_statechain_ids.contains(&statechain_id.to_string()));
    assert!(received_statechain_ids.len() == 1);

    let result = mercuryrustlib::withdraw::execute(&client_config, &wallet1.name, &statechain_id, &core_wallet_address, fee_rate).await;

    assert!(result.is_ok());

    mercuryrustlib::coin_status::update_coins(&client_config, &wallet1.name).await?;
    let wallet1: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet1.name).await?;
    let withdrawn_coin = wallet1.coins.iter().find(|&coin| coin.statechain_id == Some(statechain_id.to_string()) && coin.status == CoinStatus::WITHDRAWING);
    let transferred_coin = wallet1.coins.iter().find(|&coin| coin.statechain_id == Some(statechain_id.to_string()) && coin.status == CoinStatus::TRANSFERRED);

    assert!(withdrawn_coin.is_some());
    assert!(transferred_coin.is_some());

    let _ = bitcoin_core::generatetoaddress(client_config.confirmation_target, &core_wallet_address)?;

    mercuryrustlib::coin_status::update_coins(&client_config, &wallet1.name).await?;
    let wallet1: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet1.name).await?;
    let withdrawn_coin = wallet1.coins.iter().find(|&coin| coin.statechain_id == Some(statechain_id.to_string()) && coin.status == CoinStatus::WITHDRAWN);

    assert!(withdrawn_coin.is_some());

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

    tb02(&client_config, &wallet1, &wallet2).await?;

    println!("T02 - Transfer Address Reuse completed successfully");

    Ok(())
}
