use std::{time::Duration, str::FromStr, thread};

use anyhow::Result;
use bitcoin::Address;
use electrum_client::{ListUnspentRes, ElectrumApi};
use mercury_lib::{deposit::{create_deposit_msg1, create_aggregated_address}, wallet::Wallet, transaction::{SignFirstRequestPayload, create_and_commit_nonces}};

use crate::{sqlite_manager::{update_wallet, get_wallet}, client_config::ClientConfig};

pub async fn execute(client_config: &ClientConfig, wallet_name: &str, token_id: &str, amount: u32) -> Result<()> {

    let token_id = uuid::Uuid::new_v4() ; // uuid::Uuid::parse_str(&token_id).unwrap();
    println!("Deposit: {} {} {}", wallet_name, token_id, amount);
    let wallet = get_wallet(&client_config.pool, &wallet_name).await?;
    let mut wallet = init(&client_config, &wallet, token_id, amount).await?;

    let coin = wallet.coins.last_mut().unwrap();

    let aggregated_public_key = create_aggregated_address(&coin, wallet.network.clone())?;

    coin.amount = Some(amount);
    coin.aggregated_address = Some(aggregated_public_key.aggregate_address);
    coin.aggregated_pubkey = Some(aggregated_public_key.aggregate_pubkey);

    update_wallet(&client_config.pool, &wallet).await?;

    let coin = wallet.coins.last_mut().unwrap();

    let coin_utxo = wait_for_deposit(&client_config, &coin)?;

    coin.utxo = Some(coin_utxo);

    update_wallet(&client_config.pool, &wallet).await?;

    let coin = wallet.coins.last_mut().unwrap();

    let coin_nonce = mercury_lib::transaction::create_and_commit_nonces(&coin)?;
    coin.secret_nonce = Some(coin_nonce.secret_nonce);
    coin.public_nonce = Some(coin_nonce.public_nonce);

    let server_public_nonce = get_server_public_nonce(&client_config, &coin_nonce.sign_first_request_payload).await?;

    coin.server_public_nonce = Some(server_public_nonce);

    update_wallet(&client_config.pool, &wallet).await?;

    Ok(())
}

pub async fn init(client_config: &ClientConfig, wallet: &Wallet, token_id: uuid::Uuid, amount: u32) -> Result<Wallet> {

    let mut wallet = wallet.clone();

    let coin = wallet.get_new_coin()?;

    wallet.coins.push(coin.clone());

    update_wallet(&client_config.pool, &wallet).await?;

    let deposit_msg_1 = create_deposit_msg1(&coin, &token_id.to_string(), amount)?;

    println!("deposit_msg_1: {:?}", deposit_msg_1);

    let endpoint = client_config.statechain_entity.clone();
    let path = "deposit/init/pod";

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.post(&format!("{}/{}", endpoint, path));

    let value = request.json(&deposit_msg_1).send().await?.text().await?;

    let deposit_msg_1_response: mercury_lib::deposit::DepositMsg1Response = serde_json::from_str(value.as_str())?;

    println!("value: {:?}", value);

    println!("response: {:?}", deposit_msg_1_response);

    let deposit_init_result = mercury_lib::deposit::handle_deposit_msg_1_response(&coin, &deposit_msg_1_response)?;

    let coin = wallet.coins.last_mut().unwrap();

    coin.statechain_id = Some(deposit_init_result.statechain_id);
    coin.signed_statechain_id = Some(deposit_init_result.signed_statechain_id);
    coin.server_pubkey = Some(deposit_init_result.server_pubkey);

    update_wallet(&client_config.pool, &wallet).await?;
    

    // get_server_public_nonce(&client_config, &deposit_init_result.sign_first_request_payload).await?;
    
    Ok(wallet)
}

pub fn wait_for_deposit(client_config: &ClientConfig, coin: &mercury_lib::wallet::Coin) -> Result<String> {

    println!("address: {}", coin.aggregated_address.as_ref().unwrap().clone());

    println!("waiting for deposit ....");

    let delay = Duration::from_secs(5);

    let mut utxo: Option<ListUnspentRes> = None;

    loop {
        let address = Address::from_str(&coin.aggregated_address.as_ref().unwrap())?.require_network(client_config.network)?;

        let utxo_list =  client_config.electrum_client.script_list_unspent(&address.script_pubkey())?;

        for unspent in utxo_list {
            if unspent.value == coin.amount.unwrap() as u64 {
                utxo = Some(unspent);
                break;
            }
        }

        if utxo.is_some() {
            break;
        }

        thread::sleep(delay);
    }

    let utxo = utxo.unwrap();

    let coin_utxo = format!("{}:{}", &utxo.tx_hash, &utxo.tx_pos);
    
    Ok(coin_utxo)
}

pub async fn get_server_public_nonce(client_config: &ClientConfig,sign_first_request_payload: &SignFirstRequestPayload) -> Result<String> {

    let endpoint = client_config.statechain_entity.clone();
    let path = "sign/first";

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.post(&format!("{}/{}", endpoint, path));

    let value = request.json(&sign_first_request_payload).send().await?.text().await?;

    let sign_first_response_payload: mercury_lib::transaction::SignFirstResponsePayload = serde_json::from_str(value.as_str())?;

    Ok(sign_first_response_payload.server_pubnonce)
}