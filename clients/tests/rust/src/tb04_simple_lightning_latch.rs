use std::{env, process::Command, thread, time::Duration};
use anyhow::{Result, Ok};
use mercuryrustlib::{client_config::ClientConfig, CoinStatus, Wallet};

use crate::{bitcoin_core, electrs};

use sha2::{Sha256, Digest};

pub async fn tb04(client_config: &ClientConfig, wallet1: &Wallet, wallet2: &Wallet) -> Result<()> {

    let amount = 1000;

    // Create first deposit address

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
    let wallet1: mercuryrustlib::Wallet = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet1.name).await?;
    let new_coin = wallet1.coins.iter().find(|&coin| coin.aggregated_address == Some(deposit_address.clone()) && coin.status == CoinStatus::CONFIRMED).unwrap();
    let statechain_id = new_coin.statechain_id.as_ref().unwrap();

    let response = mercuryrustlib::lightning_latch::create_pre_image(&client_config, &wallet1.name, statechain_id).await?;

    let batch_id = response.batch_id;
    let hash = response.hash;

    let wallet2_transfer_adress = mercuryrustlib::transfer_receiver::new_transfer_address(&client_config, &wallet2.name).await?;

    mercuryrustlib::transfer_sender::execute(&client_config, &wallet2_transfer_adress, &wallet1.name, statechain_id, Some(batch_id.clone())).await?;
    
    let transfer_receive_result = mercuryrustlib::transfer_receiver::execute(&client_config, &wallet2.name).await?;

    assert!(transfer_receive_result.is_there_batch_locked);
    assert!(transfer_receive_result.received_statechain_ids.is_empty());

    mercuryrustlib::lightning_latch::confirm_pending_invoice(&client_config, &wallet1.name, &statechain_id).await?;

    let transfer_receive_result = mercuryrustlib::transfer_receiver::execute(&client_config, &wallet2.name).await?;

    assert!(!transfer_receive_result.is_there_batch_locked);
    assert!(!transfer_receive_result.received_statechain_ids.is_empty());

    let pre_image = mercuryrustlib::lightning_latch::retrieve_pre_image(&client_config, &wallet1.name, &statechain_id, &batch_id).await?;

    let pre_image_bytes = hex::decode(pre_image)?;

    let mut hasher = Sha256::new();
    hasher.update(pre_image_bytes);
    let result = hasher.finalize();

    let sha256_pre_image = hex::encode(result);
    
    assert!(sha256_pre_image == hash);

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

    tb04(&client_config, &wallet1, &wallet2).await?;

    println!("TB04 - Simple Lightning Latch completed successfully");

    Ok(())
}
