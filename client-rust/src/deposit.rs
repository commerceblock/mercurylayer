use anyhow::Result;
use mercury_lib::{deposit::{create_deposit_msg1, create_aggregated_address}, wallet::Wallet};

use crate::{sqlite_manager::{update_wallet, get_wallet}, client_config::ClientConfig};

pub async fn execute(client_config: &ClientConfig, wallet_name: &str, token_id: &str, amount: u32) -> Result<()> {

    let token_id = uuid::Uuid::new_v4() ; // uuid::Uuid::parse_str(&token_id).unwrap();
    println!("Deposit: {} {} {}", wallet_name, token_id, amount);
    let wallet = get_wallet(&client_config.pool, &wallet_name).await?;
    let mut wallet = init(&client_config, &wallet, token_id, amount).await?;

    let coin = wallet.coins.last_mut().unwrap();

    let aggregated_public_key = create_aggregated_address(&coin, wallet.network.clone())?;

    coin.aggregated_address = Some(aggregated_public_key.aggregate_address);
    coin.aggregated_pubkey = Some(aggregated_public_key.aggregate_pubkey);

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
    
    Ok(wallet)
}

