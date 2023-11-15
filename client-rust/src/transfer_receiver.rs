use crate::{sqlite_manager::{get_wallet, update_wallet}, client_config::ClientConfig};
use anyhow::Result;
use mercury_lib::transfer::receiver::GetMsgAddrResponsePayload;

pub async fn new_transfer_address(client_config: &ClientConfig, wallet_name: &str) -> Result<String>{

    let wallet = get_wallet(&client_config.pool, &wallet_name).await?;
    
    let mut wallet = wallet.clone();

    let coin = wallet.get_new_coin()?;

    wallet.coins.push(coin.clone());

    update_wallet(&client_config.pool, &wallet).await?;

    Ok(coin.address)
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
    }

    Ok(())
}