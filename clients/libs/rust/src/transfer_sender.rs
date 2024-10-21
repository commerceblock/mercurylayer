use crate::{client_config::ClientConfig, sqlite_manager::{get_backup_txs, get_wallet, update_backup_txs, update_wallet}, transaction::new_transaction, utils::info_config};
use anyhow::{anyhow, Result};
use chrono::Utc;
use mercurylib::{wallet::{Coin, BackupTx, Activity, CoinStatus}, utils::get_blockheight, decode_transfer_address, transfer::sender::{TransferSenderRequestPayload, TransferSenderResponsePayload, create_transfer_signature, create_transfer_update_msg}};
use electrum_client::ElectrumApi;

pub async fn execute(
    client_config: &ClientConfig, 
    recipient_address: &str, 
    wallet_name: &str, 
    statechain_id: &str,
    force_send: bool,
    duplicated_indexes: Option<Vec<u32>>,
    batch_id: Option<String>) -> Result<()> 
{

    if !force_send && duplicated_indexes.is_some() {
        return Err(anyhow::anyhow!("The '--force, -f' option is required when using the '--duplicated-index, -d' option"));
    }

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
    let mut min_locktime = u32::MAX;
    let mut min_index = None;

    for (index, c) in wallet.coins.iter().enumerate() {
        if c.statechain_id == Some(statechain_id.to_string()) && c.status != CoinStatus::DUPLICATED {
            let locktime = c.locktime.unwrap_or(u32::MAX);
            if locktime < min_locktime {
                min_locktime = locktime;
                min_index = Some(index);
            }
        }
    }

    let mut duplicated_coin_indexes = Vec::new();

    if duplicated_indexes.is_some() {
        let duplicated_indexes = duplicated_indexes.unwrap();
        let duplicated_indexes = duplicated_indexes.iter().map(|i| *i).collect::<Vec<u32>>();

        for duplicated_index in duplicated_indexes {
            let mut min_dup_locktime = u32::MAX;
            let mut min_dup_index = None;

            for (index, c) in wallet.coins.iter().enumerate() {
                if c.statechain_id == Some(statechain_id.to_string()) && c.status != CoinStatus::DUPLICATED && c.duplicate_index == duplicated_index {
                    let locktime = c.locktime.unwrap_or(u32::MAX);
                    if locktime < min_dup_locktime {
                        min_dup_locktime = locktime;
                        min_dup_index = Some(index);
                    }
                }
            }

            if min_dup_index.is_none() {
                return Err(anyhow::anyhow!("No duplicated coin with index {} was found", duplicated_index));
            }
            duplicated_coin_indexes.push(min_dup_index.unwrap());
        }
    }

    let coin = min_index.map(|index| &mut wallet.coins[index]);
    
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

    let mut backup_transactions = get_backup_txs(&client_config.pool, &statechain_id).await?;

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

    // TODO
    // if duplicated_indexes is some and not empt
    
     //let coins = &wallet.coins;

    let transfer_update_msg_request_payload = create_transfer_update_msg(&x1, recipient_address, &coin, &transfer_signature, &backup_transactions)?;

    let endpoint = client_config.statechain_entity.clone();
    let path = "transfer/update_msg";

    let client = client_config.get_reqwest_client()?;
    let request = client.post(&format!("{}/{}", endpoint, path));

    let status = request.json(&transfer_update_msg_request_payload).send().await?.status();

    if !status.is_success() {
        return Err(anyhow::anyhow!("Failed to update transfer message".to_string()));
    }

    update_backup_txs(&client_config.pool, &coin.statechain_id.as_ref().unwrap(), &backup_transactions).await?;

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


