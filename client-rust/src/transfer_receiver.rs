use std::str::FromStr;

use crate::{sqlite_manager::{get_wallet, update_wallet}, client_config::ClientConfig};
use anyhow::{anyhow, Result};
use bitcoin::Txid;
use electrum_client::ElectrumApi;
use mercury_lib::{transfer::receiver::{GetMsgAddrResponsePayload, verify_transfer_signature}, wallet::Coin};

pub async fn new_transfer_address(client_config: &ClientConfig, wallet_name: &str) -> Result<String>{

    let wallet = get_wallet(&client_config.pool, &wallet_name).await?;
    
    let mut wallet = wallet.clone();

    let coin = wallet.get_new_coin()?;

    wallet.coins.push(coin.clone());

    update_wallet(&client_config.pool, &wallet).await?;

    Ok(coin.address)
}

pub async fn execute(client_config: &ClientConfig, wallet_name: &str) -> Result<()>{

    let wallet = get_wallet(&client_config.pool, &wallet_name).await?;
    
    for coin in wallet.coins.iter() {

        println!("----\nuser_pubkey: {}", coin.user_pubkey);
        println!("auth_pubkey: {}", coin.auth_pubkey);
        println!("statechain_id: {}", coin.statechain_id.as_ref().unwrap_or(&"".to_string()));
        println!("coin.amount: {}", coin.amount.unwrap_or(0));
        println!("coin.status: {}", coin.status);

        let enc_messages = get_msg_addr(&coin.auth_pubkey, &client_config.statechain_entity).await?;
        if enc_messages.len() == 0 {
            println!("No messages");
            continue;
        }

        println!("enc_messages: {:?}", enc_messages);

        process_encrypted_message(client_config, coin, &enc_messages).await?;
    }

    Ok(())
}

async fn get_msg_addr(auth_pubkey: &str, statechain_entity_url: &str) -> Result<Vec<String>> {
    let endpoint = statechain_entity_url;
    let path = format!("transfer/get_msg_addr/{}", auth_pubkey.to_string());

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.get(&format!("{}/{}", endpoint, path));

    let value = request.send().await?.text().await?;

    let response: GetMsgAddrResponsePayload = serde_json::from_str(value.as_str())?;

    Ok(response.list_enc_transfer_msg)
}

async fn process_encrypted_message(client_config: &ClientConfig, coin: &Coin, enc_messages: &Vec<String>) -> Result<()> {

    let client_auth_key = coin.auth_privkey.clone();
    let new_user_pubkey = coin.user_pubkey.clone();

    for enc_message in enc_messages {

        let transfer_msg = mercury_lib::transfer::receiver::decrypt_transfer_msg(enc_message, &client_auth_key)?;

        // println!("transfer_msg: {:?}", transfer_msg);

        let tx0_outpoint = mercury_lib::transfer::receiver::get_tx0_outpoint(&transfer_msg.backup_transactions)?;
        
        println!("tx0_outpoint: {:?}", tx0_outpoint);

        let tx0_hex = get_tx0(&client_config.electrum_client, &tx0_outpoint.txid).await?;

        println!("tx0_hex: {}", tx0_hex);

        let is_transfer_signature_valid = verify_transfer_signature(&new_user_pubkey, &tx0_outpoint, &transfer_msg)?; 

        println!("is_transfer_signature_valid: {}", is_transfer_signature_valid);
    }

    Ok(())
}

async fn get_tx0(electrum_client: &electrum_client::Client, tx0_txid: &str) -> Result<String> {

    let tx0_txid = Txid::from_str(tx0_txid)?;
    let tx_bytes = electrum_client.batch_transaction_get_raw(&[tx0_txid])?;

    if tx_bytes.len() == 0 {
        return Err(anyhow!("tx0 not found"));
    }

    // let tx0 = bitcoin::consensus::encode::deserialize(&tx_bytes[0])?;

    let tx0_hex = hex::encode(&tx_bytes[0]);

    Ok(tx0_hex)
}

