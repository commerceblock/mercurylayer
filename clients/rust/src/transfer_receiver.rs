use std::{str::FromStr, thread, time::Duration};

use crate::{sqlite_manager::{get_wallet, update_wallet, insert_or_update_backup_txs}, client_config::ClientConfig, utils};
use anyhow::{anyhow, Result};
use bitcoin::{Txid, Address};
use chrono::Utc;
use electrum_client::ElectrumApi;
use mercurylib::{transfer::receiver::{create_transfer_receiver_request_payload, get_new_key_info, sign_message, validate_tx0_output_pubkey, verify_blinded_musig_scheme, verify_latest_backup_tx_pays_to_user_pubkey, verify_transaction_signature, verify_transfer_signature, GetMsgAddrResponseItem, GetMsgAddrResponsePayload, StatechainInfoResponsePayload, TransferReceiverError, TransferReceiverErrorResponsePayload, TransferReceiverPostResponsePayload, TransferReceiverRequestPayload, TransferUnlockRequestPayload, TxOutpoint}, utils::{get_blockheight, get_network, InfoConfig}, wallet::{Activity, Coin, CoinStatus}};
use reqwest::StatusCode;

pub async fn new_transfer_address(client_config: &ClientConfig, wallet_name: &str) -> Result<String>{

    let wallet = get_wallet(&client_config.pool, &wallet_name).await?;
    
    let mut wallet = wallet.clone();

    let coin = wallet.get_new_coin()?;

    wallet.coins.push(coin.clone());

    update_wallet(&client_config.pool, &wallet).await?;

    Ok(coin.address)
}

pub async fn execute(client_config: &ClientConfig, wallet_name: &str) -> Result<()>{

    let mut wallet = get_wallet(&client_config.pool, &wallet_name).await?;

    let info_config = utils::info_config(&client_config).await.unwrap();
    
    let mut activities = wallet.activities.as_mut();

    for coin in wallet.coins.iter_mut() {

        if coin.status != CoinStatus::INITIALISED {
            continue;
        }

        println!("----\nuser_pubkey: {}", coin.user_pubkey);
        println!("auth_pubkey: {}", coin.auth_pubkey);
        println!("statechain_id: {}", coin.statechain_id.as_ref().unwrap_or(&"".to_string()));
        println!("coin.amount: {}", coin.amount.unwrap_or(0));
        println!("coin.status: {}", coin.status);

        let enc_messages = get_msg_addr(&coin.auth_pubkey, &client_config).await?;
        if enc_messages.len() == 0 {
            println!("No messages");
            continue;
        }

        println!("enc_messages: {:?}", enc_messages);

        process_encrypted_message(client_config, coin, &enc_messages, &wallet.network, &info_config, &mut activities).await?;
    }

    update_wallet(&client_config.pool, &wallet).await?;

    Ok(())
}

async fn get_msg_addr(auth_pubkey: &str, client_config: &ClientConfig) -> Result<Vec<GetMsgAddrResponseItem>> {

    let path = format!("transfer/get_msg_addr/{}", auth_pubkey.to_string());

    let client = client_config.get_reqwest_client()?;
    let request = client.get(&format!("{}/{}", client_config.statechain_entity, path));

    let value = request.send().await?.text().await?;

    let response: GetMsgAddrResponsePayload = serde_json::from_str(value.as_str())?;

    Ok(response.list_enc_transfer_msg)
}

async fn process_encrypted_message(client_config: &ClientConfig, coin: &mut Coin, enc_messages: &Vec<GetMsgAddrResponseItem>, network: &str, info_config: &InfoConfig, activities: &mut Vec<Activity>) -> Result<()> {

    let client_auth_key = coin.auth_privkey.clone();
    let new_user_pubkey = coin.user_pubkey.clone();

    for enc_message_item in enc_messages {

        let enc_message = enc_message_item.encrypted_transfer_msg.clone();

        let transfer_id = enc_message_item.transfer_id.clone();

        let transfer_msg = mercurylib::transfer::receiver::decrypt_transfer_msg(&enc_message, &client_auth_key)?;

        // println!("transfer_msg: {:?}", transfer_msg);

        let tx0_outpoint = mercurylib::transfer::receiver::get_tx0_outpoint(&transfer_msg.backup_transactions)?;
        
        println!("tx0_outpoint: {:?}", tx0_outpoint);

        let tx0_hex = get_tx0(&client_config.electrum_client, &tx0_outpoint.txid).await?;

        println!("tx0_hex: {}", tx0_hex);

        let is_transfer_signature_valid = verify_transfer_signature(&new_user_pubkey, &tx0_outpoint, &transfer_msg)?; 

        println!("is_transfer_signature_valid: {}", is_transfer_signature_valid);

        if !is_transfer_signature_valid {
            println!("Invalid transfer signature");
            continue;
        }

        let statechain_info = get_statechain_info(&transfer_msg.statechain_id, &client_config).await?;

        let is_tx0_output_pubkey_valid = validate_tx0_output_pubkey(&statechain_info.enclave_public_key, &transfer_msg, &tx0_outpoint, &tx0_hex, network)?;

        if !is_tx0_output_pubkey_valid {
            println!("Invalid tx0 output pubkey");
            continue;
        }

        let latest_backup_tx_pays_to_user_pubkey = verify_latest_backup_tx_pays_to_user_pubkey(&transfer_msg, &new_user_pubkey, network)?;
    
        println!("latest_backup_tx_pays_to_user_pubkey: {}", latest_backup_tx_pays_to_user_pubkey);

        if !latest_backup_tx_pays_to_user_pubkey {
            println!("Latest Backup Tx does not pay to the expected public key");
            continue;
        }

        if statechain_info.num_sigs != transfer_msg.backup_transactions.len() as u32 {
            println!("num_sigs is not correct");
            continue;
        }

        let (is_tx0_output_unspent, tx0_status) = verify_tx0_output_is_unspent_and_confirmed(&client_config.electrum_client, &tx0_outpoint, &tx0_hex, &network, client_config.confirmation_target).await?;

        if !is_tx0_output_unspent {
            println!("tx0 output is spent or not confirmed.");
            continue;
        }

        let current_fee_rate_sats_per_byte = info_config.fee_rate_sats_per_byte as u32;

        let fee_rate_tolerance = client_config.fee_rate_tolerance;

        let mut previous_lock_time: Option<u32> = None;

        let mut sig_scheme_validation = true;

        for (index, backup_tx) in transfer_msg.backup_transactions.iter().enumerate() {

            let statechain_info = statechain_info.statechain_info.get(index).unwrap();

            let is_signature_valid = verify_transaction_signature(&backup_tx.tx, &tx0_hex, fee_rate_tolerance, current_fee_rate_sats_per_byte);
            if is_signature_valid.is_err() {
                println!("{}", is_signature_valid.err().unwrap().to_string());
                sig_scheme_validation = false;
                break;
            }

            let is_blinded_musig_scheme_valid = verify_blinded_musig_scheme(&backup_tx, &tx0_hex, statechain_info);
            if is_blinded_musig_scheme_valid.is_err() {
                println!("{}", is_blinded_musig_scheme_valid.err().unwrap().to_string());
                sig_scheme_validation = false;
                break;
            }

            if previous_lock_time.is_some() {
                let prev_lock_time = previous_lock_time.unwrap();
                let current_lock_time = get_blockheight(&backup_tx)?;
                if (prev_lock_time - current_lock_time) as i32 != info_config.interval as i32 {
                    println!("interval is not correct");
                    sig_scheme_validation = false;
                    break;
                }
            }

            previous_lock_time = Some(get_blockheight(&backup_tx)?);
        }

        if !sig_scheme_validation {
            println!("Signature scheme validation failed");
            continue;
        }

        let transfer_receiver_request_payload = create_transfer_receiver_request_payload(&statechain_info, &transfer_msg, &coin, &transfer_id)?;
    
        // unlock the statecoin - it might be part of a batch

        // the pub_auth_key has not been updated yet in the server (it will be updated after the transfer/receive call)
        // So we need to manually sign the statechain_id with the client_auth_key
        let signed_statechain_id_for_unlock = sign_message(&transfer_msg.statechain_id, &coin)?;

        unlock_statecoin(&client_config, &transfer_msg.statechain_id, &signed_statechain_id_for_unlock, &coin.auth_pubkey).await?;

        // let server_public_key_hex = send_transfer_receiver_request_payload(&client_config, &transfer_receiver_request_payload).await?;

        let transfer_receiver_result = send_transfer_receiver_request_payload(&client_config, &transfer_receiver_request_payload).await;

        let server_public_key_hex = match transfer_receiver_result {
            Ok(server_public_key_hex) => server_public_key_hex,
            Err(err) => {
                println!("Error: {}", err.to_string());
                continue;
            }
        };
    
        let new_key_info = get_new_key_info(&server_public_key_hex, &coin, &transfer_msg.statechain_id, &tx0_outpoint, &tx0_hex, network)?;

        if previous_lock_time.is_none() {
            println!("previous_lock_time is None");
            continue;
        }

        coin.server_pubkey = Some(server_public_key_hex);
        coin.aggregated_pubkey = Some(new_key_info.aggregate_pubkey);
        coin.aggregated_address = Some(new_key_info.aggregate_address);
        coin.statechain_id = Some(transfer_msg.statechain_id.clone());
        coin.signed_statechain_id = Some(new_key_info.signed_statechain_id.clone());
        coin.amount = Some(new_key_info.amount);
        coin.utxo_txid = Some(tx0_outpoint.txid.clone());
        coin.utxo_vout = Some(tx0_outpoint.vout);
        coin.locktime = Some(previous_lock_time.unwrap());
        coin.status = tx0_status;

        let date = Utc::now(); // This will get the current date and time in UTC
        let iso_string = date.to_rfc3339(); // Converts the date to an ISO 8601 string

        let activity = Activity {
            utxo: tx0_outpoint.txid.clone(),
            amount: new_key_info.amount,
            action: "Receive".to_string(),
            date: iso_string
        };

        activities.push(activity);

        insert_or_update_backup_txs(&client_config.pool, &transfer_msg.statechain_id, &transfer_msg.backup_transactions).await?;
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

async fn get_statechain_info(statechain_id: &str, client_config: &ClientConfig) -> Result<StatechainInfoResponsePayload> {

    let path = format!("info/statechain/{}", statechain_id.to_string());

    let client = client_config.get_reqwest_client()?;
    let request = client.get(&format!("{}/{}", client_config.statechain_entity, path));

    let value = match request.send().await {
        Ok(response) => {
            let text = response.text().await.unwrap();
            text
        },
        Err(err) => {
            return Err(anyhow!(err.to_string()));
        },
    };

    let response: StatechainInfoResponsePayload = serde_json::from_str(value.as_str())?;

    Ok(response)
}

async fn verify_tx0_output_is_unspent_and_confirmed(electrum_client: &electrum_client::Client, tx0_outpoint: &TxOutpoint, tx0_hex: &str, network: &str, confirmation_target: u32) -> Result<(bool, CoinStatus)> {
    let output_address = mercurylib::transfer::receiver::get_output_address_from_tx0(&tx0_outpoint, &tx0_hex, &network)?;

    let network = get_network(&network)?;
    let address = Address::from_str(&output_address)?.require_network(network)?;
    let script = address.script_pubkey();
    let script = script.as_script();

    let res = electrum_client.script_list_unspent(script)?;

    let block_header = electrum_client.block_headers_subscribe_raw()?;
    let blockheight = block_header.height;

    let mut status = CoinStatus::UNCONFIRMED;

    for unspent in res {
        if (unspent.tx_hash.to_string() == tx0_outpoint.txid) && (unspent.tx_pos as u32 == tx0_outpoint.vout) {
            let confirmations = blockheight - unspent.height + 1;

            if confirmations as u32 >= confirmation_target {
                status = CoinStatus::CONFIRMED;
            }

            return Ok((true, status));
        }
    }

    Ok((false, status))
}

async fn unlock_statecoin(client_config: &ClientConfig, statechain_id: &str, signed_statechain_id: &str, auth_pubkey: &str) -> Result<()> {

    let path = "transfer/unlock";

    let client = client_config.get_reqwest_client()?;
    let request = client.post(&format!("{}/{}", client_config.statechain_entity, path));

    let transfer_unlock_request_payload = TransferUnlockRequestPayload {
        statechain_id: statechain_id.to_string(),
        auth_sig: signed_statechain_id.to_string(),
        auth_pub_key: auth_pubkey.to_string(),
    };

    let status = request.json(&transfer_unlock_request_payload).send().await?.status();

    if !status.is_success() {
        return Err(anyhow::anyhow!("Failed to update transfer message".to_string()));
    }

    Ok(())
}

async fn send_transfer_receiver_request_payload(client_config: &ClientConfig, transfer_receiver_request_payload: &TransferReceiverRequestPayload) -> Result<String>{

    let path = "transfer/receiver";

    let client = client_config.get_reqwest_client()?;

    loop {
        let request = client.post(&format!("{}/{}", client_config.statechain_entity, path));

        let response = request.json(&transfer_receiver_request_payload).send().await?;

        let status = response.status();

        let value = response.text().await?;

        if status == StatusCode::BAD_REQUEST{

            let error: TransferReceiverErrorResponsePayload = serde_json::from_str(value.as_str())?;

            match error.code {
                TransferReceiverError::ExpiredBatchTimeError => {
                    return Err(anyhow::anyhow!(error.message));
                },
                TransferReceiverError::StatecoinBatchLockedError => {
                    println!("Statecoin batch still locked. Waiting until expiration or unlock.");
                    thread::sleep(Duration::from_secs(5));
                    continue;
                },
            }
        }

        if status == StatusCode::OK {
            let response: TransferReceiverPostResponsePayload = serde_json::from_str(value.as_str())?;
            return Ok(response.server_pubkey);
        } else {
            return Err(anyhow::anyhow!("{}: {}", "Failed to update transfer message".to_string(), value));
        }
    }
}