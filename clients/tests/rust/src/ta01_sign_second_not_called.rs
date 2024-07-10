use std::{env, process::Command, thread, time::Duration};
use anyhow::{anyhow, Result, Ok};
use mercuryrustlib::{client_config::ClientConfig, create_and_commit_nonces, decode_transfer_address, sqlite_manager::get_wallet, Coin, CoinStatus, SignFirstRequestPayload, SignFirstResponsePayload, TransferSenderRequestPayload, TransferSenderResponsePayload, Wallet};

use crate::{bitcoin_core, electrs};

/// This function gets the server public nonce from the statechain entity.
pub async fn sign_first(client_config: &ClientConfig, sign_first_request_payload: &SignFirstRequestPayload) -> Result<String> {

    let endpoint = client_config.statechain_entity.clone();
    let path = "sign/first";

    let client = client_config.get_reqwest_client()?;
    let request = client.post(&format!("{}/{}", endpoint, path));

    let value = request.json(&sign_first_request_payload).send().await?.text().await?;

    let sign_first_response_payload: SignFirstResponsePayload = serde_json::from_str(value.as_str())?;

    let mut server_pubnonce_hex = sign_first_response_payload.server_pubnonce.to_string();

    if server_pubnonce_hex.starts_with("0x") {
        server_pubnonce_hex = server_pubnonce_hex[2..].to_string();
    }

    Ok(server_pubnonce_hex)
}

pub async fn new_transaction_only_sign_first(
    client_config: &ClientConfig, 
    coin: &mut Coin) -> Result<()> {

    let coin_nonce = create_and_commit_nonces(&coin)?;
    coin.secret_nonce = Some(coin_nonce.secret_nonce);
    coin.public_nonce = Some(coin_nonce.public_nonce);
    coin.blinding_factor = Some(coin_nonce.blinding_factor);

    let _ = sign_first(&client_config, &coin_nonce.sign_first_request_payload).await?;

    Ok(())
}

pub async fn execute_only_sign_first(
    client_config: &ClientConfig, 
    recipient_address: &str, 
    wallet_name: &str, 
    statechain_id: &str, 
    batch_id: Option<String>) -> Result<()> 
{

    let mut wallet = get_wallet(&client_config.pool, &wallet_name).await?;

    let coin = wallet.coins
        .iter_mut()
        .filter(|tx| tx.statechain_id == Some(statechain_id.to_string())) // Filter coins with the specified statechain_id
        .min_by_key(|tx| tx.locktime.unwrap_or(u32::MAX)); // Find the one with the lowest locktime

    if coin.is_none() {
        return Err(anyhow!("No coins associated with this statechain ID were found"));
    }

    let coin = coin.unwrap();

    let statechain_id = coin.statechain_id.as_ref().unwrap();
    let signed_statechain_id = coin.signed_statechain_id.as_ref().unwrap();

    let (_, _, recipient_auth_pubkey) = decode_transfer_address(recipient_address)?;  
    let _ = get_new_x1(&client_config,  statechain_id, signed_statechain_id, &recipient_auth_pubkey.to_string(), batch_id).await?;

    let _ = new_transaction_only_sign_first(client_config, coin).await?;

    Ok(())

}

async fn get_new_x1(client_config: &ClientConfig,  statechain_id: &str, signed_statechain_id: &str, recipient_auth_pubkey: &str, batch_id: Option<String>) -> Result<String> {
    
    let endpoint = client_config.statechain_entity.clone();
    let path = "transfer/sender";

    let client = client_config.get_reqwest_client()?;
    let request = client.post(&format!("{}/{}", endpoint, path));

    let transfer_sender_request_payload = TransferSenderRequestPayload {
        statechain_id: statechain_id.to_string(),
        auth_sig: signed_statechain_id.to_string(),
        new_user_auth_key: recipient_auth_pubkey.to_string(),
        batch_id,
    };

    let value = match request.json(&transfer_sender_request_payload).send().await {
        std::result::Result::Ok(response) => {

            let status = response.status();
            let text = response.text().await.unwrap_or("Unexpected error".to_string());

            if status.is_success() {
                text
            } else {
                return Err(anyhow::anyhow!(format!("status: {}, error: {}", status, text)));
            }
        },
        Err(err) => {
            return Err(anyhow::anyhow!(format!("status: {}, error: {}", err.status().unwrap(),err.to_string())));
        },
    };

    let response: TransferSenderResponsePayload = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));

    Ok(response.x1)
}

async fn ta01(client_config: &ClientConfig, wallet1: &Wallet, wallet2: &Wallet) -> Result<()> {

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
    let wallet1 = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet1.name).await?;
    let new_coin = wallet1.coins.iter().find(|&coin| coin.aggregated_address == Some(address.clone())).unwrap();

    assert!(new_coin.status == CoinStatus::CONFIRMED);

    let statechain_id = new_coin.statechain_id.as_ref().unwrap();

    let batch_id = None;

    let wallet2_transfer_adress = mercuryrustlib::transfer_receiver::new_transfer_address(&client_config, &wallet2.name).await?;

    execute_only_sign_first(
        &client_config, 
        &wallet2_transfer_adress, 
        &wallet1.name, 
        &statechain_id, 
        batch_id).await?;

    mercuryrustlib::coin_status::update_coins(&client_config, &wallet1.name).await?;
    let wallet1 = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet1.name).await?;

    let batch_id = None;

    let result = mercuryrustlib::transfer_sender::execute(&client_config, &wallet2_transfer_adress, &wallet1.name, &statechain_id, batch_id).await;

    assert!(result.is_ok());

    let transfer_receive_result = mercuryrustlib::transfer_receiver::execute(&client_config, &wallet2.name).await?;
    let received_statechain_ids = transfer_receive_result.received_statechain_ids;

    assert!(received_statechain_ids.contains(&statechain_id.to_string()));
    assert!(received_statechain_ids.len() == 1);

    let wallet2 = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet2.name).await?;

    let new_coin = wallet2.coins.iter().find(|&coin| coin.statechain_id == Some(statechain_id.to_string())).unwrap();

    assert!(new_coin.status == CoinStatus::CONFIRMED);

    mercuryrustlib::coin_status::update_coins(&client_config, &wallet1.name).await?;
    let wallet1 = mercuryrustlib::sqlite_manager::get_wallet(&client_config.pool, &wallet1.name).await?;

    let new_coin = wallet1.coins.iter().find(|&coin| coin.statechain_id == Some(statechain_id.to_string())).unwrap();

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

    ta01(&client_config, &wallet1, &wallet2).await?;

    println!("TA01 - 'SignSecond not called' tested successfully");

    Ok(())
}
