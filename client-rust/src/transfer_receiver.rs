use std::str::FromStr;

use crate::{sqlite_manager::{get_wallet, update_wallet}, client_config::ClientConfig, utils};
use anyhow::{anyhow, Result};
use bitcoin::{Txid, Address, network};
use electrum_client::ElectrumApi;
use mercury_lib::{transfer::receiver::{GetMsgAddrResponsePayload, verify_transfer_signature, StatechainInfoResponsePayload, validate_tx0_output_pubkey, verify_latest_backup_tx_pays_to_user_pubkey, TxOutpoint, verify_transaction_signature, verify_blinded_musig_scheme, create_transfer_receiver_request_payload, TransferReceiverRequestPayload}, wallet::Coin, utils::{get_network, InfoConfig, get_blockheight}};
use serde_json::Value;

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

    let info_config = utils::info_config(&client_config.statechain_entity, &client_config.electrum_client).await.unwrap();
    
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

        process_encrypted_message(client_config, coin, &enc_messages, &wallet.network, &info_config).await?;
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

async fn process_encrypted_message(client_config: &ClientConfig, coin: &Coin, enc_messages: &Vec<String>, network: &str, info_config: &InfoConfig) -> Result<()> {

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

        if !is_transfer_signature_valid {
            println!("Invalid transfer signature");
            continue;
        }

        let statechain_info = get_statechain_info(&transfer_msg.statechain_id, &client_config.statechain_entity).await?;

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

        let is_tx0_output_unspent = verify_tx0_output_is_unspent(&client_config.electrum_client, &tx0_outpoint, &tx0_hex, &network).await?;

        if !is_tx0_output_unspent {
            println!("tx0 output is spent");
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

        let transfer_receiver_request_payload = create_transfer_receiver_request_payload(&statechain_info, &transfer_msg, &coin)?;
    
        send_transfer_receiver_request_payload(&client_config.statechain_entity, &transfer_receiver_request_payload).await?;
    
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

async fn get_statechain_info(statechain_id: &str, statechain_entity_url: &str) -> Result<StatechainInfoResponsePayload> {

    let endpoint = statechain_entity_url;
    let path = format!("info/statechain/{}", statechain_id.to_string());

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.get(&format!("{}/{}", endpoint, path));

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

async fn verify_tx0_output_is_unspent(electrum_client: &electrum_client::Client, tx0_outpoint: &TxOutpoint, tx0_hex: &str, network: &str) -> Result<bool> {
    let output_address = mercury_lib::transfer::receiver::get_output_address_from_tx0(&tx0_outpoint, &tx0_hex, &network)?;

    let network = get_network(&network)?;
    let address = Address::from_str(&output_address)?.require_network(network)?;
    let script = address.script_pubkey();
    let script = script.as_script();

    let res = electrum_client.script_list_unspent(script)?;

    Ok(res.len() > 0)
}

async fn send_transfer_receiver_request_payload(statechain_entity_url: &str, transfer_receiver_request_payload: &TransferReceiverRequestPayload) -> Result<()>{

    let endpoint = statechain_entity_url;
    let path = "transfer/receiver";

    let client = reqwest::Client::new();
    let request = client.post(&format!("{}/{}", endpoint, path));

    let value = request.json(&transfer_receiver_request_payload).send().await?.text().await?;

    let response: Value = serde_json::from_str(value.as_str())?;

    let server_public_key_hex = response.get("server_pubkey").unwrap().as_str().unwrap();

    println!("server_public_key_hex: {}", server_public_key_hex);

    Ok(())    
}