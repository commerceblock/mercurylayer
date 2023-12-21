
use crate::utils::create_activity;
use std::str::FromStr;

use bitcoin::Address;
use electrum_client::{ElectrumApi, ListUnspentRes};
use mercury_lib::wallet::{CoinStatus, Coin, Activity, BackupTx};
use anyhow::{anyhow, Result, Ok};
use serde_json::Value;

use crate::{client_config::ClientConfig, sqlite_manager::{get_wallet, update_wallet, insert_backup_txs}, deposit::create_tx1};

struct DepositResult {
    activity: Activity,
    backup_tx: BackupTx,
}

async fn check_deposit(client_config: &ClientConfig, coin: &mut Coin, wallet_netwotk: &str) -> Result<Option<DepositResult>> {

    if coin.statechain_id.is_none() && coin.utxo_txid.is_none() && coin.utxo_vout.is_none() {
        if coin.status != CoinStatus::INITIALISED {
            return Err(anyhow!("Coin does not have a statechain ID, a UTXO and the status is not INITIALISED"));
        } else {
            return Ok(None);
        }
    }

    let mut utxo: Option<ListUnspentRes> = None;

    let address = Address::from_str(&coin.aggregated_address.as_ref().unwrap())?.require_network(client_config.network)?;

    let utxo_list =  client_config.electrum_client.script_list_unspent(&address.script_pubkey())?;

    for unspent in utxo_list {
        if unspent.value == coin.amount.unwrap() as u64 {
            utxo = Some(unspent);
            break;
        }
    }

    // No deposit found. No change in the coin status
    if utxo.is_none() {
        return Ok(None);
        // return Err(anyhow!("There is no UTXO with the address {} and the amount {}", coin.aggregated_address.as_ref().unwrap(), coin.amount.unwrap()));
    }

    let utxo = utxo.unwrap();

    // IN_MEMPOOL. there is nothing to do
    if utxo.height == 0 && coin.status == CoinStatus::IN_MEMPOOL {
        return Ok(None);
    }

    let block_header = client_config.electrum_client.block_headers_subscribe_raw()?;
    let blockheight = block_header.height;

    let mut deposit_result: Option<DepositResult> = None;

    if coin.status == CoinStatus::INITIALISED {
        let utxo_txid = utxo.tx_hash.to_string();
        let utxo_vout = utxo.tx_pos as u32;

        let backup_tx = create_tx1(client_config, coin, wallet_netwotk, &utxo_txid, utxo_vout).await?;

        let activity_utxo = format!("{}:{}", utxo.tx_hash.to_string(), utxo.tx_pos);

        let activity = Some(create_activity(&activity_utxo, utxo.value as u32, "deposit"));
        // return Ok(Some(activity));

        deposit_result = Some(DepositResult {
            activity: activity.unwrap(),
            backup_tx
        });
    }

    if utxo.height > 0 {

        let confirmations = blockheight - utxo.height + 1;

        coin.status = CoinStatus::UNCONFIRMED;

        if confirmations as u32 >= client_config.confirmation_target {
            coin.status = CoinStatus::CONFIRMED;
        }
    }

    Ok(deposit_result)
}

async fn check_transfer(client_config: &ClientConfig, coin: &Coin) -> Result<bool> {

    if coin.statechain_id.is_none() {
        return Err(anyhow!("Coin does not have a statechain ID"));
    }

    let statechain_id = coin.statechain_id.as_ref().unwrap();

    let endpoint = client_config.statechain_entity.clone();
    let path = format!("transfer/receiver/{}", statechain_id);

    let client = client_config.get_reqwest_client()?;
    let request = client.get(&format!("{}/{}", endpoint, path));

    let value = request.send().await?.text().await?;

    let response: Value = serde_json::from_str(value.as_str())?;

    let is_transfer_complete = response.get("transfer_complete").unwrap().as_bool().unwrap();

    Ok(is_transfer_complete)
}

async fn check_withdrawal(client_config: &ClientConfig, coin: &mut Coin) -> Result<()> {

    let mut txid: Option<String> = None;

    if coin.tx_withdraw.is_some() {
        txid = Some(coin.tx_withdraw.as_ref().unwrap().to_string());
    }

    if coin.tx_cpfp.is_some() {
        if txid.is_some() {
            return Err(anyhow!("Coin has both tx_withdraw and tx_cpfp"));
        }
        txid = Some(coin.tx_cpfp.as_ref().unwrap().to_string());
    }

    if txid.is_none() {
        return Err(anyhow!("Coin does not have tx_withdraw or tx_cpfp"));
    }

    let txid = txid.unwrap();

    if coin.withdrawal_address.is_none() {
        return Err(anyhow!("Coin does not have withdrawal_address"));
    }

    let address = Address::from_str(&coin.withdrawal_address.as_ref().unwrap())?.require_network(client_config.network)?;

    let utxo_list =  client_config.electrum_client.script_list_unspent(&address.script_pubkey())?;

    let mut utxo: Option<ListUnspentRes> = None;

    for unspent in utxo_list {
        if unspent.tx_hash.to_string() == txid {
            utxo = Some(unspent);
            break;
        }
    }

    if utxo.is_none() {
        // sometimes the transaction has not yet been transmitted to the specified Electrum server
        // return Err(anyhow!("There is no UTXO with the address {} and the txid {}", coin.withdrawal_address.as_ref().unwrap(), txid));
        return Ok(());
    }

    let utxo = utxo.unwrap();

    if utxo.height > 0 {

        let block_header = client_config.electrum_client.block_headers_subscribe_raw()?;
        let blockheight = block_header.height;

        let confirmations = blockheight - utxo.height + 1;

        if confirmations as u32 >= client_config.confirmation_target {
            coin.status = CoinStatus::WITHDRAWN;
        }
    }


    Ok(())
}

pub async fn update_coins(client_config: &ClientConfig, wallet_name: &str) -> Result<()> {
    
    let mut wallet: mercury_lib::wallet::Wallet = get_wallet(&client_config.pool, &wallet_name).await?;

    let network = wallet.network.clone();

    for coin in wallet.coins.iter_mut() {

        if coin.status == CoinStatus::INITIALISED || coin.status == CoinStatus::IN_MEMPOOL || coin.status == CoinStatus::UNCONFIRMED {
        
            let deposit_result = check_deposit(client_config, coin, &network).await?;
        
            if deposit_result.is_some() {
                let deposit_result = deposit_result.unwrap();
                let activity = deposit_result.activity;
                let backup_tx = deposit_result.backup_tx;

                wallet.activities.push(activity);
                insert_backup_txs(&client_config.pool, &coin.statechain_id.as_ref().unwrap(), &[backup_tx].to_vec()).await?;
            }
        } else if coin.status == CoinStatus::IN_TRANSFER {

            let is_transferred = check_transfer(client_config, coin).await?;

            if is_transferred {
                coin.status = CoinStatus::TRANSFERRED;
            }

        } else if coin.status == CoinStatus::WITHDRAWING {
            check_withdrawal(client_config, coin).await?;
        }
    }

    update_wallet(&client_config.pool, &wallet).await?;

    Ok(())
}