use anyhow::{anyhow, Result, Ok};
use mercury_lib::{deposit::{create_deposit_msg1, create_aggregated_address}, wallet::{Wallet, BackupTx, CoinStatus, Coin}, transaction:: get_user_backup_address, utils::get_blockheight};

use crate::{sqlite_manager::update_wallet, get_wallet, client_config::ClientConfig, transaction::new_transaction};

pub async fn get_deposit_bitcoin_address(client_config: &ClientConfig, wallet_name: &str, token_id: &str, amount: u32) -> Result<String> {

    let token_id = uuid::Uuid::parse_str(&token_id)?;
    // println!("Deposit: {} {} {}", wallet_name, token_id, amount);
    let wallet = get_wallet(&client_config.pool, &wallet_name).await?;
    let mut wallet = init(&client_config, &wallet, token_id).await?;

    let coin = wallet.coins.last_mut().unwrap();

    let aggregated_public_key = create_aggregated_address(&coin, wallet.network.clone())?;

    coin.amount = Some(amount);
    coin.aggregated_address = Some(aggregated_public_key.aggregate_address.clone());
    coin.aggregated_pubkey = Some(aggregated_public_key.aggregate_pubkey);

    update_wallet(&client_config.pool, &wallet).await?;

    Ok(aggregated_public_key.aggregate_address)
}

pub async fn create_tx1(client_config: &ClientConfig, coin: &mut Coin, wallet_netwotk: &str, tx0_hash: &str, tx0_vout: u32) -> Result<BackupTx> {

    if coin.status != CoinStatus::INITIALISED {
        return Err(anyhow!("The coin with the public key {} is not in the INITIALISED state", coin.user_pubkey.to_string()));
    }

    if coin.utxo_txid.is_some() && coin.utxo_vout.is_some() {
        return Err(anyhow!("The coin with the public key {} has already been deposited", coin.user_pubkey.to_string()));
    }
    coin.utxo_txid = Some(tx0_hash.to_string());
    coin.utxo_vout = Some(tx0_vout);

    coin.status = CoinStatus::IN_MEMPOOL;

    let to_address = get_user_backup_address(&coin, wallet_netwotk.to_string())?;

    let signed_tx = new_transaction(&client_config, coin, &to_address, 0, false, None, wallet_netwotk).await?;

    if coin.public_nonce.is_none() {
        return Err(anyhow::anyhow!("coin.public_nonce is None"));
    }

    if coin.blinding_factor.is_none() {
        return Err(anyhow::anyhow!("coin.blinding_factor is None"));
    }

    if coin.statechain_id.is_none() {
        return Err(anyhow::anyhow!("coin.statechain_id is None"));
    }

    let backup_tx = BackupTx {
        tx_n: 1,
        tx: signed_tx,
        client_public_nonce: coin.public_nonce.as_ref().unwrap().to_string(),
        server_public_nonce: coin.server_public_nonce.as_ref().unwrap().to_string(),
        client_public_key: coin.user_pubkey.clone(),
        server_public_key: coin.server_pubkey.as_ref().unwrap().to_string(),
        blinding_factor: coin.blinding_factor.as_ref().unwrap().to_string(),
    };

    let block_height = Some(get_blockheight(&backup_tx)?);
    coin.locktime = block_height;

    Ok(backup_tx)
}

pub async fn init(client_config: &ClientConfig, wallet: &Wallet, token_id: uuid::Uuid) -> Result<Wallet> {

    let mut wallet = wallet.clone();

    let coin = wallet.get_new_coin()?;

    wallet.coins.push(coin.clone());

    update_wallet(&client_config.pool, &wallet).await?;

    let deposit_msg_1 = create_deposit_msg1(&coin, &token_id.to_string())?;

    // println!("deposit_msg_1: {:?}", deposit_msg_1);

    let endpoint = client_config.statechain_entity.clone();
    let path = "deposit/init/pod";

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.post(&format!("{}/{}", endpoint, path));

    let response = request.json(&deposit_msg_1).send().await?;

    if response.status() != 200 {
        let response_body = response.text().await?;
        return Err(anyhow!(response_body));
    }

    let value = response.text().await?;

    let deposit_msg_1_response: mercury_lib::deposit::DepositMsg1Response = serde_json::from_str(value.as_str())?;

    // println!("value: {:?}", value);

    // println!("response: {:?}", deposit_msg_1_response);

    let deposit_init_result = mercury_lib::deposit::handle_deposit_msg_1_response(&coin, &deposit_msg_1_response)?;

    let coin = wallet.coins.last_mut().unwrap();

    coin.statechain_id = Some(deposit_init_result.statechain_id);
    coin.signed_statechain_id = Some(deposit_init_result.signed_statechain_id);
    coin.server_pubkey = Some(deposit_init_result.server_pubkey);

    update_wallet(&client_config.pool, &wallet).await?;

    Ok(wallet)
}

pub async fn get_token(client_config: &ClientConfig) -> Result<String> {

    let endpoint = client_config.statechain_entity.clone();
    let path = "deposit/get_token";

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.get(&format!("{}/{}", endpoint, path));

    let response = request.send().await?;

    if response.status() != 200 {
        let response_body = response.text().await?;
        return Err(anyhow!(response_body));
    }

    let value = response.text().await?;

    let token: mercury_lib::deposit::TokenID = serde_json::from_str(value.as_str())?;

    return Ok(token.token_id);
}
