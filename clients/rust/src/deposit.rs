use std::str::FromStr;
use anyhow::{anyhow, Result, Ok};
use bitcoin::Address;
use chrono::Utc;
use electrum_client::{ListUnspentRes, ElectrumApi};
use mercury_lib::{deposit::{create_deposit_msg1, create_aggregated_address}, wallet::{Wallet, Activity, BackupTx, CoinStatus}, transaction:: get_user_backup_address, utils::get_blockheight};

use crate::{sqlite_manager::{update_wallet, get_wallet, insert_backup_txs}, client_config::ClientConfig, transaction::new_transaction};

pub async fn get_deposit_bitcoin_address(client_config: &ClientConfig, wallet_name: &str, token_id: &str, amount: u32) -> Result<String> {

    let token_id = uuid::Uuid::new_v4() ; // uuid::Uuid::parse_str(&token_id).unwrap();
    println!("Deposit: {} {} {}", wallet_name, token_id, amount);
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

pub async fn create_statecoin(client_config: &ClientConfig, wallet_name: &str, aggregated_address: &str) -> Result<()> {

    let mut wallet: mercury_lib::wallet::Wallet = get_wallet(&client_config.pool, &wallet_name).await?;

    let mut coin = wallet.coins
        .iter_mut()
        .filter(|c| c.aggregated_address == Some(aggregated_address.to_string())); // Filter coins with the specified statechain_id

    let coin = coin.next();

    if coin.is_none() {
        return Err(anyhow!("There is no coin with the aggregated address {}", aggregated_address));
    }

    let coin = coin.unwrap();

    if coin.status != CoinStatus::INITIALISED {
        return Err(anyhow!("The coin with the aggregated address {} is not in the INITIALISED state", aggregated_address));
    }

    if coin.utxo_txid.is_some() && coin.utxo_vout.is_some() {
        return Err(anyhow!("The coin with the aggregated address {} has already been deposited", aggregated_address));
    }

    let list_unspent_res = check_deposit(&client_config, &coin).await?;

    coin.utxo_txid = Some(list_unspent_res.tx_hash.to_string());
    coin.utxo_vout = Some(list_unspent_res.tx_pos as u32);

    coin.status = CoinStatus::IN_MEMPOOL;

    update_wallet(&client_config.pool, &wallet).await?;

    let coin = wallet.coins.last_mut().unwrap();

    let to_address = get_user_backup_address(&coin, wallet.network.to_string())?;

    let signed_tx = new_transaction(&client_config, coin, &to_address, 0, false, None, &wallet.network).await?;

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

    insert_backup_txs(&client_config.pool, &coin.statechain_id.as_ref().unwrap(), &[backup_tx].to_vec()).await?;

    let date = Utc::now(); // This will get the current date and time in UTC
    let iso_string = date.to_rfc3339(); // Converts the date to an ISO 8601 string

    let activity = Activity {
        utxo: coin.utxo_txid.clone().unwrap(),
        amount: coin.amount.unwrap(),
        action: "Deposit".to_string(),
        date: iso_string
    };

    wallet.activities.push(activity);

    update_wallet(&client_config.pool, &wallet).await?;

    Ok(())
}

async fn check_deposit(client_config: &ClientConfig, coin: &mercury_lib::wallet::Coin) -> Result<ListUnspentRes> {

    let mut utxo: Option<ListUnspentRes> = None;

    let address = Address::from_str(&coin.aggregated_address.as_ref().unwrap())?.require_network(client_config.network)?;

    let utxo_list =  client_config.electrum_client.script_list_unspent(&address.script_pubkey())?;

    for unspent in utxo_list {
        if unspent.value == coin.amount.unwrap() as u64 {
            utxo = Some(unspent);
            break;
        }
    }

    if utxo.is_none() {
        return Err(anyhow!("There is no UTXO with the address {} and the amount {}", coin.aggregated_address.as_ref().unwrap(), coin.amount.unwrap()));
    }

    Ok(utxo.unwrap())
}
/*
pub async fn execute(client_config: &ClientConfig, wallet_name: &str, token_id: &str, amount: u32) -> Result<()> {

    let token_id = uuid::Uuid::new_v4() ; // uuid::Uuid::parse_str(&token_id).unwrap();
    println!("Deposit: {} {} {}", wallet_name, token_id, amount);
    let wallet = get_wallet(&client_config.pool, &wallet_name).await?;
    let mut wallet = init(&client_config, &wallet, token_id).await?;

    let coin = wallet.coins.last_mut().unwrap();

    let aggregated_public_key = create_aggregated_address(&coin, wallet.network.clone())?;

    coin.amount = Some(amount);
    coin.aggregated_address = Some(aggregated_public_key.aggregate_address);
    coin.aggregated_pubkey = Some(aggregated_public_key.aggregate_pubkey);

    update_wallet(&client_config.pool, &wallet).await?;

    let coin = wallet.coins.last_mut().unwrap();

    let (utxo_txid, utxo_vout) = wait_for_deposit(&client_config, &coin)?;

    coin.utxo_txid = Some(utxo_txid.clone());
    coin.utxo_vout = Some(utxo_vout);

    coin.status = CoinStatus::IN_MEMPOOL;

    update_wallet(&client_config.pool, &wallet).await?;

    let coin = wallet.coins.last_mut().unwrap();

    let to_address = get_user_backup_address(&coin, wallet.network.to_string())?;

    let signed_tx = new_transaction(&client_config, coin, &to_address, 0, false, None, &wallet.network).await?;

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

    // let wallet_backup_txs = WalletBackupTxs {
    //     statechain_id: coin.statechain_id.as_ref().unwrap().to_string(),
    //     backup_txs: [backup_tx].to_vec(),
    // };

    insert_backup_txs(&client_config.pool, &coin.statechain_id.as_ref().unwrap(), &[backup_tx].to_vec()).await?;

    // let tx_bytes = hex::decode(signed_tx)?;
    // let txid = client_config.electrum_client.transaction_broadcast_raw(&tx_bytes)?;

    // println!("--> txid sent: {}", txid);

    let date = Utc::now(); // This will get the current date and time in UTC
    let iso_string = date.to_rfc3339(); // Converts the date to an ISO 8601 string

    let activity = Activity {
        utxo: utxo_txid,
        amount,
        action: "Deposit".to_string(),
        date: iso_string
    };

    wallet.activities.push(activity);

    update_wallet(&client_config.pool, &wallet).await?;

    Ok(())
}
 */

pub async fn init(client_config: &ClientConfig, wallet: &Wallet, token_id: uuid::Uuid) -> Result<Wallet> {

    let mut wallet = wallet.clone();

    let coin = wallet.get_new_coin()?;

    wallet.coins.push(coin.clone());

    update_wallet(&client_config.pool, &wallet).await?;

    let deposit_msg_1 = create_deposit_msg1(&coin, &token_id.to_string())?;

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

/*
pub fn wait_for_deposit(client_config: &ClientConfig, coin: &mercury_lib::wallet::Coin) -> Result<(String, u32)> {

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

    Ok((utxo.tx_hash.to_string(), utxo.tx_pos as u32))
}
*/
