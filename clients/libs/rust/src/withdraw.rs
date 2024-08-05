use crate::{client_config::ClientConfig, sqlite_manager::{get_backup_txs, get_wallet, update_wallet}, transaction::new_transaction, utils::info_config};
use anyhow::{anyhow, Result};
use electrum_client::ElectrumApi;
use mercurylib::wallet::CoinStatus;


pub async fn execute(client_config: &ClientConfig, wallet_name: &str, statechain_id: &str, to_address: &str, fee_rate: Option<f64>, duplicated_index: Option<u32>) -> Result<()>{

    let mut wallet: mercurylib::wallet::Wallet = get_wallet(&client_config.pool, &wallet_name).await?;

    let is_address_valid = mercurylib::validate_address(to_address, &wallet.network)?;

    if !is_address_valid {
        return Err(anyhow!("Invalid address"));
    }

    let backup_txs = get_backup_txs(&client_config.pool, &statechain_id).await?;
    
    if backup_txs.len() == 0 {
        return Err(anyhow!("No backup transaction associated with this statechain ID were found"));
    }

    let qt_backup_tx = backup_txs.len() as u32;

    // let new_tx_n = qt_backup_tx + 1;

    // If the user sends to himself, he will have two coins with same statechain_id
    // In this case, we need to find the one with the lowest locktime

    let coin: Option<&mut mercurylib::wallet::Coin> = match duplicated_index {
        Some(index) => wallet.coins
            .iter_mut()
            .filter(|c| c.statechain_id == Some(statechain_id.to_string())
                  && c.status == CoinStatus::DUPLICATED
                  && c.duplicate_index == index)
            .min_by_key(|c| c.locktime),
        None => wallet.coins
            .iter_mut()
            .filter(|c| c.statechain_id == Some(statechain_id.to_string())
                    && c.status != CoinStatus::DUPLICATED)
            .min_by_key(|c| c.locktime) // Find the one with the lowest locktime
    };

    if coin.is_none() {

        match duplicated_index {
            Some(index) => { return Err(anyhow!("No duplicated coins associated with this statechain ID and index {} were found", index)); },
            None => { return Err(anyhow!("No coins associated with this statechain ID were found")) },
        }
    }

    let coin = coin.unwrap();

    if coin.amount.is_none() {
        return Err(anyhow::anyhow!("coin.amount is None"));
    }

    if coin.status != CoinStatus::CONFIRMED && coin.status != CoinStatus::IN_TRANSFER && coin.status != CoinStatus::DUPLICATED {
        return Err(anyhow::anyhow!("Coin status must be CONFIRMED or IN_TRANSFER or DUPLICATED to withdraw it. The current status is {}", coin.status));
    }

    let server_info = info_config(&client_config).await?;

    let fee_rate_sats_per_byte = match fee_rate {
        Some(fee_rate) => fee_rate,
        None => if server_info.fee_rate_sats_per_byte > client_config.max_fee_rate {
            client_config.max_fee_rate
        } else {
            server_info.fee_rate_sats_per_byte
        },
    };

    let signed_tx = new_transaction(
        client_config, 
        coin,
        &to_address,
        qt_backup_tx,
        true,
        None,
        &wallet.network,
        fee_rate_sats_per_byte,
        server_info.initlock,
        server_info.interval
    ).await?;

    if coin.public_nonce.is_none() {
        return Err(anyhow::anyhow!("coin.public_nonce is None"));
    }

    if coin.blinding_factor.is_none() {
        return Err(anyhow::anyhow!("coin.blinding_factor is None"));
    }

    if coin.statechain_id.is_none() {
        return Err(anyhow::anyhow!("coin.statechain_id is None"));
    }

    /*let backup_tx = BackupTx {
        tx_n: new_tx_n,
        tx: signed_tx.clone(),
        client_public_nonce: coin.public_nonce.as_ref().unwrap().to_string(),
        server_public_nonce: coin.server_public_nonce.as_ref().unwrap().to_string(),
        client_public_key: coin.user_pubkey.clone(),
        server_public_key: coin.server_pubkey.as_ref().unwrap().to_string(),
        blinding_factor: coin.blinding_factor.as_ref().unwrap().to_string(),
    };

    backup_txs.push(backup_tx);

    update_backup_txs(&client_config.pool, &coin.statechain_id.as_ref().unwrap(), &backup_txs).await?;*/

    let tx_bytes = hex::decode(&signed_tx)?;
    let txid = client_config.electrum_client.transaction_broadcast_raw(&tx_bytes)?;

    coin.tx_withdraw = Some(txid.to_string());
    coin.withdrawal_address = Some(to_address.to_string());
    coin.status = CoinStatus::WITHDRAWING;

    let activity = crate::utils::create_activity(
        &txid.to_string(), coin.amount.unwrap(), "Withdraw");

    wallet.activities.push(activity);

    let signed_statechain_id = coin.signed_statechain_id.as_ref().unwrap().to_string();

    update_wallet(&client_config.pool, &wallet).await?;

    let is_there_more_duplicated_coins = wallet.coins.iter().any(|coin| {
        (coin.status == CoinStatus::DUPLICATED || coin.status == CoinStatus::CONFIRMED) &&
        duplicated_index.map_or(true, |index| coin.duplicate_index != index)
    });

    if !is_there_more_duplicated_coins {
        crate::utils::complete_withdraw(statechain_id, &signed_statechain_id, &client_config).await?;
    }

    Ok(())

}