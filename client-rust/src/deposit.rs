use std::{time::{Duration, SystemTime, UNIX_EPOCH}, str::FromStr, thread};

use anyhow::Result;
use bitcoin::Address;
use chrono::Utc;
use electrum_client::{ListUnspentRes, ElectrumApi};
use mercury_lib::{deposit::{create_deposit_msg1, create_aggregated_address}, wallet::{Wallet, Activity, BackupTx}, transaction::{get_partial_sig_request, get_user_backup_address, create_signature, new_backup_transaction}};

use crate::{sqlite_manager::{update_wallet, get_wallet, insert_backup_txs}, client_config::ClientConfig, transaction::{sign_first, sign_second}, utils::info_config};

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

    let (utxo_txid, utxo_vout) = wait_for_deposit(&client_config, &coin)?;

    coin.utxo_txid = Some(utxo_txid.clone());
    coin.utxo_vout = Some(utxo_vout);

    update_wallet(&client_config.pool, &wallet).await?;

    let coin = wallet.coins.last_mut().unwrap();

    let coin_nonce = mercury_lib::transaction::create_and_commit_nonces(&coin)?;
    coin.secret_nonce = Some(coin_nonce.secret_nonce);
    coin.public_nonce = Some(coin_nonce.public_nonce);
    coin.blinding_factor = Some(coin_nonce.blinding_factor);

    // new transaction

    let server_public_nonce = sign_first(&client_config, &coin_nonce.sign_first_request_payload).await?;

    coin.server_public_nonce = Some(server_public_nonce);

    update_wallet(&client_config.pool, &wallet).await?;

    let coin = wallet.coins.last_mut().unwrap();

    let server_info = info_config(&client_config.statechain_entity, &client_config.electrum_client).await?;

    let block_header = client_config.electrum_client.block_headers_subscribe_raw()?;
    let block_height = block_header.height as u32;

    let initlock = server_info.initlock;
    let interval = server_info.interval;
    let fee_rate_sats_per_byte = server_info.fee_rate_sats_per_byte as u32;
    let qt_backup_tx = 0;

    let network = wallet.network.clone();
    let to_address = get_user_backup_address(&coin, network.clone())?;
    let is_withdrawal = false;

    let partial_sig_request = get_partial_sig_request(
        &coin, 
        block_height, 
        initlock, 
        interval, 
        fee_rate_sats_per_byte,
        qt_backup_tx,
        to_address,
        network.clone(),
        is_withdrawal)?;

    let server_partial_sig_request = partial_sig_request.partial_signature_request_payload;

    let server_partial_sig = sign_second(&client_config, &server_partial_sig_request).await?;

    println!("server_partial_sig: {}", hex::encode(server_partial_sig.serialize()));

    let client_partial_sig_hex = partial_sig_request.client_partial_sig;
    let server_partial_sig_hex = hex::encode(server_partial_sig.serialize());
    let msg = partial_sig_request.msg;
    let session_hex = partial_sig_request.encoded_session;
    let output_pubkey_hex = partial_sig_request.output_pubkey;

    let encoded_unsigned_tx = partial_sig_request.encoded_unsigned_tx;
    
    let signature = create_signature(msg, client_partial_sig_hex, server_partial_sig_hex, session_hex, output_pubkey_hex)?;

    println!("signature: {}", signature);
    println!("encoded_unsigned_tx: {}", encoded_unsigned_tx);

    let signed_tx = new_backup_transaction(encoded_unsigned_tx, signature)?;

    println!("signed_tx: {}", signed_tx);

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
        tx_n: 0,
        tx: signed_tx,
        client_public_nonce: coin.public_nonce.as_ref().unwrap().to_string(),
        blinding_factor: coin.blinding_factor.as_ref().unwrap().to_string(),
    };

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