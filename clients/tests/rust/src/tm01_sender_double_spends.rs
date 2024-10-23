use std::{env, process::Command, thread, time::Duration};
use anyhow::{Result, Ok};
use mercuryrustlib::{client_config::ClientConfig, CoinStatus, Wallet};

use crate::{bitcoin_core, electrs};

async fn tm01(client_config: &ClientConfig, wallet1: &Wallet, wallet2: &Wallet, wallet3: &Wallet) -> Result<()> {

    let amount = 1000;

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
    let new_coin = wallet1.coins.iter().find(|&coin| coin.aggregated_address == Some(address.clone())).unwrap();

    assert!(new_coin.status == CoinStatus::CONFIRMED);

    let batch_id = None;

    let force_send = false;

    let statechain_id = new_coin.statechain_id.as_ref().unwrap();

    let wallet2_transfer_adress = mercuryrustlib::transfer_receiver::new_transfer_address(&client_config, &wallet2.name).await?;

    let result = mercuryrustlib::transfer_sender::execute(&client_config, &wallet2_transfer_adress, &wallet1.name, &statechain_id, None, force_send, batch_id).await;

    assert!(result.is_ok());

    let wallet3_transfer_adress = mercuryrustlib::transfer_receiver::new_transfer_address(&client_config, &wallet3.name).await?;

    let batch_id = None;

    // this first "double spend" is legitimate, as it will overwrite the previous transaction
    let result = mercuryrustlib::transfer_sender::execute(&client_config, &wallet3_transfer_adress, &wallet1.name, &statechain_id, None, force_send, batch_id).await;

    assert!(result.is_ok());

    let transfer_receive_result = mercuryrustlib::transfer_receiver::execute(&client_config, &wallet3.name).await?;
    let received_statechain_ids = transfer_receive_result.received_statechain_ids;

    assert!(received_statechain_ids.len() == 1);

    assert!(received_statechain_ids[0] == statechain_id.to_string());

    let batch_id = None;

    // this second "double spend" is not legitimate, as the statecoin has already been received by wallet3
    let result = mercuryrustlib::transfer_sender::execute(&client_config, &wallet2_transfer_adress, &wallet1.name, &statechain_id, None, force_send, batch_id).await;

    assert!(result.is_err());

    assert!(result.err().unwrap().to_string().contains("Signature does not match authentication key"));

    // If we update wallet1, the error will happen when we try to send the coin to wallet2
    // The step above tested that the sender can double spend the coin, but the server will not accept it

    mercuryrustlib::coin_status::update_coins(&client_config, &wallet1.name).await?;
    let wallet1: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet1.name).await?;

    let batch_id = None;

    let result = mercuryrustlib::transfer_sender::execute(&client_config, &wallet2_transfer_adress, &wallet1.name, &statechain_id, None, force_send, batch_id).await;

    assert!(result.is_err());

    assert!(result.err().unwrap().to_string().contains("No coins with status CONFIRMED or IN_TRANSFER associated with this statechain ID were found"));

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

    tm01(&client_config, &wallet1, &wallet2, &wallet3).await?;

    println!("TM01 - Sender Double Spends Test completed successfully");

    Ok(())
}
