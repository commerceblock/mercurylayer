use crate::{client_config::ClientConfig, deposit::create_tx1, sqlite_manager::{get_backup_txs, get_wallet, update_backup_txs, update_wallet}, transaction::new_transaction, utils::info_config};
use anyhow::{anyhow, Result};
use chrono::Utc;
use mercurylib::{decode_transfer_address, transfer::sender::{create_transfer_signature, create_transfer_update_msg, TransferSenderRequestPayload, TransferSenderResponsePayload}, utils::get_blockheight, wallet::{get_previous_outpoint, Activity, BackupTx, Coin, CoinStatus, Wallet}};
use electrum_client::ElectrumApi;

pub async fn create_backup_transaction(
    client_config: &ClientConfig, 
    recipient_address: &str,
    wallet: &mut Wallet,
    statechain_id: &str,
    duplicated_indexes: Option<Vec<u32>>,
) -> Result<Vec<BackupTx>> {

    //let mut wallet: mercurylib::wallet::Wallet = get_wallet(&client_config.pool, &wallet_name).await?;

    // throw error if duplicated_indexes contains an index that does not exist in wallet.coins
    // this can be moved to the caller function
    if duplicated_indexes.is_some() {
        for index in duplicated_indexes.as_ref().unwrap() {
            if *index as usize >= wallet.coins.len() {
                return Err(anyhow!("Index {} does not exist in wallet.coins", index));
            }
        }
    }  

    let mut coin_list: Vec<&mut Coin> = Vec::new();

    let backup_transactions = get_backup_txs(&client_config.pool, &wallet.name, &statechain_id).await?;

    // Get coins that already have a backup transaction
    for coin in wallet.coins.iter_mut() {
        // Check if coin matches any backup transaction
        let has_matching_tx = backup_transactions.iter().any(|backup_tx| {
            if let Ok(tx_outpoint) = get_previous_outpoint(backup_tx) {
                if let (Some(utxo_txid), Some(utxo_vout)) = (coin.utxo_txid.clone(), coin.utxo_vout) {
                    tx_outpoint.txid == utxo_txid && tx_outpoint.vout == utxo_vout
                } else {
                    false
                }
            } else {
                false
            }
        });

        let mut coin_to_add = false;

        if duplicated_indexes.is_some() {
            if coin.statechain_id == Some(statechain_id.to_string()) && 
            (coin.status == CoinStatus::CONFIRMED || coin.status == CoinStatus::IN_TRANSFER) {
                coin_to_add = true;
            }

            if coin.statechain_id == Some(statechain_id.to_string()) && coin.status == CoinStatus::DUPLICATED && 
                duplicated_indexes.is_some() && duplicated_indexes.as_ref().unwrap().contains(&coin.duplicate_index) {
                coin_to_add = true;
            }
        }

        if has_matching_tx || coin_to_add {
            if coin.locktime.is_none() {
                return Err(anyhow::anyhow!("coin.locktime is None"));
            }
        
            let block_header = client_config.electrum_client.block_headers_subscribe_raw()?;
            let current_blockheight = block_header.height as u32;
        
            if current_blockheight > coin.locktime.unwrap()  {
                return Err(anyhow::anyhow!("The coin is expired. Coin locktime is {} and current blockheight is {}", coin.locktime.unwrap(), current_blockheight));
            }

            coin_list.push(coin);
        }
    }

    // The backup transaction for the CONFIRMED coin is created when it is detected in the mempool
    // So it is exepcted that the coin with duplicate_index == 0 is in the list since it must have at least one backup transaction
    let coins_with_zero_index = coin_list
        .iter()
        .filter(|coin| coin.duplicate_index == 0 && (coin.status == CoinStatus::CONFIRMED || coin.status == CoinStatus::IN_TRANSFER))
        .collect::<Vec<_>>();

    if coins_with_zero_index.len() != 1 {
        return Err(anyhow!("There must be at least one coin with duplicate_index == 0"));
    }

    println!("coin_list.len(): {}", coin_list.len());

    let mut new_backup_transactions = Vec::new();

    // create backup transaction for every coin
    let backup_transactions = get_backup_txs(&client_config.pool, &wallet.name, &statechain_id).await?;

    for coin in coin_list {
        let mut filtered_transactions: Vec<BackupTx> = Vec::new();

        for backup_tx in &backup_transactions {
            if let Ok(tx_outpoint) = get_previous_outpoint(&backup_tx) {
                if let (Some(utxo_txid), Some(utxo_vout)) = (coin.utxo_txid.clone(), coin.utxo_vout) {
                    if tx_outpoint.txid == utxo_txid && tx_outpoint.vout == utxo_vout {
                        filtered_transactions.push(backup_tx.clone());
                    }
                }
            }
        }

        filtered_transactions.sort_by(|a, b| a.tx_n.cmp(&b.tx_n));

        let qt_backup_tx = filtered_transactions.len() as u32;

        if qt_backup_tx == 0 {
            let bkp_tx1 = create_tx1(client_config, coin, &wallet.network).await?;
            filtered_transactions.push(bkp_tx1);
        }    

        let new_tx_n = qt_backup_tx as u32 + 1;

        let bkp_tx1 = &filtered_transactions[0];

        let signed_tx = create_backup_tx_to_receiver(client_config, coin, bkp_tx1, recipient_address, qt_backup_tx, &wallet.network).await?;

        let backup_tx = BackupTx {
            tx_n: new_tx_n,
            tx: signed_tx.clone(),
            client_public_nonce: coin.public_nonce.as_ref().unwrap().to_string(),
            server_public_nonce: coin.server_public_nonce.as_ref().unwrap().to_string(),
            client_public_key: coin.user_pubkey.clone(),
            server_public_key: coin.server_pubkey.as_ref().unwrap().to_string(),
            blinding_factor: coin.blinding_factor.as_ref().unwrap().to_string(),
        };

        filtered_transactions.push(backup_tx);

        if coin.duplicate_index == 0 {
            new_backup_transactions.splice(0..0, filtered_transactions);
        } else {
            new_backup_transactions.extend(filtered_transactions);
        }

        coin.status = CoinStatus::IN_TRANSFER;
    }

    println!("new_backup_transactions.len(): {}", new_backup_transactions.len());

    Ok(new_backup_transactions)
}


pub async fn execute2(
    client_config: &ClientConfig, 
    recipient_address: &str, 
    wallet_name: &str, 
    statechain_id: &str,
    duplicated_indexes: Option<Vec<u32>>,
    force_send: bool,
    batch_id: Option<String>) -> Result<()> 
{
    let mut wallet: mercurylib::wallet::Wallet = get_wallet(&client_config.pool, &wallet_name).await?;

    let is_address_valid = mercurylib::validate_address(recipient_address, &wallet.network)?;

    if !is_address_valid {
        return Err(anyhow!("Invalid address"));
    }

    let is_coin_duplicated = wallet.coins.iter().any(|c| {
        c.statechain_id == Some(statechain_id.to_string()) &&
        c.status == CoinStatus::DUPLICATED
    });

    if is_coin_duplicated && !force_send {
        return Err(anyhow::anyhow!("Coin is duplicated. If you want to proceed, use the command '--force, -f' option. \
        You will no longer be able to move other duplicate coins with the same statechain_id and this will cause PERMANENT LOSS of these duplicate coin funds."));
    }

    let are_there_duplicate_coins_withdrawn = wallet.coins.iter().any(|c| {
        c.statechain_id == Some(statechain_id.to_string()) &&
        (c.status == CoinStatus::WITHDRAWING || c.status == CoinStatus::WITHDRAWING) &&
        c.duplicate_index > 0
    });

    if are_there_duplicate_coins_withdrawn {
        return Err(anyhow::anyhow!("There have been withdrawals of other coins with this same statechain_id (possibly duplicates).\
        This transfer cannot be performed because the recipient would reject it due to the difference in signature count.\
        This coin can be withdrawn, however."));
    }

    let coin = &wallet.coins
        .iter()
        .filter(|c| 
            c.statechain_id == Some(statechain_id.to_string()) && 
            (c.status == CoinStatus::CONFIRMED || c.status == CoinStatus::IN_TRANSFER) && 
            c.duplicate_index == 0) // Filter coins with the specified statechain_id
        .min_by_key(|c| c.locktime.unwrap_or(u32::MAX)); // Find the one with the lowest locktime

    if coin.is_none() {
        return Err(anyhow!("No coins associated with this statechain ID were found"));
    }

    let coin = coin.unwrap().clone();

    let statechain_id = coin.statechain_id.as_ref().unwrap().clone();
    let signed_statechain_id = coin.signed_statechain_id.as_ref().unwrap().clone();

    let (_, _, recipient_auth_pubkey) = decode_transfer_address(recipient_address)?;  
    let x1 = get_new_x1(&client_config, &statechain_id, &signed_statechain_id, &recipient_auth_pubkey.to_string(), batch_id).await?;

    let input_txid = coin.utxo_txid.as_ref().unwrap();
    let input_vout = coin.utxo_vout.unwrap();
    let client_seckey = coin.user_privkey.as_ref();

    let coin_amount = coin.amount.unwrap();

    let transfer_signature = create_transfer_signature(recipient_address, &input_txid, input_vout, &client_seckey)?; 

    let backup_transactions = create_backup_transaction(client_config, recipient_address, &mut wallet, &statechain_id, duplicated_indexes).await?;

    let transfer_update_msg_request_payload = create_transfer_update_msg(&x1, recipient_address, &coin, &transfer_signature, &backup_transactions)?;

    let endpoint = client_config.statechain_entity.clone();
    let path = "transfer/update_msg";

    let client = client_config.get_reqwest_client()?;
    let request = client.post(&format!("{}/{}", endpoint, path));

    let status = request.json(&transfer_update_msg_request_payload).send().await?.status();

    if !status.is_success() {
        return Err(anyhow::anyhow!("Failed to update transfer message".to_string()));
    }

    update_backup_txs(&client_config.pool, &wallet.name, &coin.statechain_id.as_ref().unwrap(), &backup_transactions).await?;

    let date = Utc::now(); // This will get the current date and time in UTC
    let iso_string = date.to_rfc3339(); // Converts the date to an ISO 8601 string

    let utxo = format!("{}:{}", input_txid, input_vout);

    let activity = Activity {
        utxo,
        amount: coin_amount,
        action: "Transfer".to_string(),
        date: iso_string
    };

    wallet.activities.push(activity);

    update_wallet(&client_config.pool, &wallet).await?;

    Ok(())
}


pub async fn execute(
    client_config: &ClientConfig, 
    recipient_address: &str, 
    wallet_name: &str, 
    statechain_id: &str,
    force_send: bool,
    batch_id: Option<String>) -> Result<()> 
{

    let mut wallet: mercurylib::wallet::Wallet = get_wallet(&client_config.pool, &wallet_name).await?;

    let is_address_valid = mercurylib::validate_address(recipient_address, &wallet.network)?;

    if !is_address_valid {
        return Err(anyhow!("Invalid address"));
    }

    let is_coin_duplicated = wallet.coins.iter().any(|c| {
        c.statechain_id == Some(statechain_id.to_string()) &&
        c.status == CoinStatus::DUPLICATED
    });

    let are_there_duplicate_coins_withdrawn = wallet.coins.iter().any(|c| {
        c.statechain_id == Some(statechain_id.to_string()) &&
        (c.status == CoinStatus::WITHDRAWING || c.status == CoinStatus::WITHDRAWING) &&
        c.duplicate_index > 0
    });

    if are_there_duplicate_coins_withdrawn {
        return Err(anyhow::anyhow!("There have been withdrawals of other coins with this same statechain_id (possibly duplicates).\
        This transfer cannot be performed because the recipient would reject it due to the difference in signature count.\
        This coin can be withdrawn, however."));
    }

    // If the user sends to himself, he will have two coins with same statechain_id
    // In this case, we need to find the one with the lowest locktime
    let coin = wallet.coins
        .iter_mut()
        .filter(|c| c.statechain_id == Some(statechain_id.to_string()) && c.status != CoinStatus::DUPLICATED) // Filter coins with the specified statechain_id
        .min_by_key(|c| c.locktime.unwrap_or(u32::MAX)); // Find the one with the lowest locktime

    if coin.is_none() {
        return Err(anyhow!("No coins associated with this statechain ID were found"));
    }

    let coin = coin.unwrap();

    if is_coin_duplicated && !force_send {
        return Err(anyhow::anyhow!("Coin is duplicated. If you want to proceed, use the command '--force, -f' option. \
        You will no longer be able to move other duplicate coins with the same statechain_id and this will cause PERMANENT LOSS of these duplicate coin funds."));
    }

    if coin.amount.is_none() {
        return Err(anyhow::anyhow!("coin.amount is None"));
    }

    if coin.status != CoinStatus::CONFIRMED && coin.status != CoinStatus::IN_TRANSFER {
        return Err(anyhow::anyhow!("Coin status must be CONFIRMED or IN_TRANSFER to transfer it. The current status is {}", coin.status));
    }

    if coin.locktime.is_none() {
        return Err(anyhow::anyhow!("coin.locktime is None"));
    }

    let block_header = client_config.electrum_client.block_headers_subscribe_raw()?;
    let current_blockheight = block_header.height as u32;

    if current_blockheight > coin.locktime.unwrap()  {
        return Err(anyhow::anyhow!("The coin is expired. Coin locktime is {} and current blockheight is {}", coin.locktime.unwrap(), current_blockheight));
    }

    let statechain_id = coin.statechain_id.as_ref().unwrap();
    let signed_statechain_id = coin.signed_statechain_id.as_ref().unwrap();

    let (_, _, recipient_auth_pubkey) = decode_transfer_address(recipient_address)?;  
    let x1 = get_new_x1(&client_config,  statechain_id, signed_statechain_id, &recipient_auth_pubkey.to_string(), batch_id).await?;

    let mut backup_transactions = get_backup_txs(&client_config.pool, &wallet.name, &statechain_id).await?;

    if backup_transactions.len() == 0 {
        return Err(anyhow!("No backup transaction associated with this statechain ID were found"));
    }

    let qt_backup_tx = backup_transactions.len() as u32;

    backup_transactions.sort_by(|a, b| a.tx_n.cmp(&b.tx_n));

    let new_tx_n = backup_transactions.len() as u32 + 1;

    let bkp_tx1 = &backup_transactions[0];

    let signed_tx = create_backup_tx_to_receiver(client_config, coin, bkp_tx1, recipient_address, qt_backup_tx, &wallet.network).await?;

    let backup_tx = BackupTx {
        tx_n: new_tx_n,
        tx: signed_tx.clone(),
        client_public_nonce: coin.public_nonce.as_ref().unwrap().to_string(),
        server_public_nonce: coin.server_public_nonce.as_ref().unwrap().to_string(),
        client_public_key: coin.user_pubkey.clone(),
        server_public_key: coin.server_pubkey.as_ref().unwrap().to_string(),
        blinding_factor: coin.blinding_factor.as_ref().unwrap().to_string(),
    };

    backup_transactions.push(backup_tx);

    let input_txid = coin.utxo_txid.as_ref().unwrap();
    let input_vout = coin.utxo_vout.unwrap();
    let client_seckey = coin.user_privkey.as_ref();

    let transfer_signature = create_transfer_signature(recipient_address, input_txid, input_vout, client_seckey)?; 

    let transfer_update_msg_request_payload = create_transfer_update_msg(&x1, recipient_address, &coin, &transfer_signature, &backup_transactions)?;

    let endpoint = client_config.statechain_entity.clone();
    let path = "transfer/update_msg";

    let client = client_config.get_reqwest_client()?;
    let request = client.post(&format!("{}/{}", endpoint, path));

    let status = request.json(&transfer_update_msg_request_payload).send().await?.status();

    if !status.is_success() {
        return Err(anyhow::anyhow!("Failed to update transfer message".to_string()));
    }

    update_backup_txs(&client_config.pool, &wallet.name, &coin.statechain_id.as_ref().unwrap(), &backup_transactions).await?;

    let date = Utc::now(); // This will get the current date and time in UTC
    let iso_string = date.to_rfc3339(); // Converts the date to an ISO 8601 string

    let utxo = format!("{}:{}", input_txid, input_vout);

    let activity = Activity {
        utxo,
        amount: coin.amount.unwrap(),
        action: "Transfer".to_string(),
        date: iso_string
    };

    wallet.activities.push(activity);
    coin.status = CoinStatus::IN_TRANSFER;

    update_wallet(&client_config.pool, &wallet).await?;

    Ok(())
}

async fn create_backup_tx_to_receiver(client_config: &ClientConfig, coin: &mut Coin, bkp_tx1: &BackupTx, recipient_address: &str, qt_backup_tx: u32, network: &str) -> Result<String> {

    let block_height = Some(get_blockheight(bkp_tx1)?);

    let server_info = info_config(&client_config).await?;

    let fee_rate_sats_per_byte = if server_info.fee_rate_sats_per_byte > client_config.max_fee_rate {
        client_config.max_fee_rate
    } else {
        server_info.fee_rate_sats_per_byte
    };

    let is_withdrawal = false;
    let signed_tx = new_transaction(
        client_config, 
        coin, 
        recipient_address, 
        qt_backup_tx, 
        is_withdrawal, 
        block_height, 
        network, 
        fee_rate_sats_per_byte, 
        server_info.initlock,
        server_info.interval).await?;

    Ok(signed_tx)
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
        Ok(response) => {

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


