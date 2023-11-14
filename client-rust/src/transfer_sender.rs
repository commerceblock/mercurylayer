use crate::{client_config::ClientConfig, sqlite_manager::{get_wallet, get_backup_txs}, transaction::new_transaction};
use anyhow::{anyhow, Result};
use bitcoin::{Transaction, network, Network, Address};
use mercury_lib::{wallet::{Coin, BackupTx, key_derivation}, utils::{get_network, get_blockheight}, decode_transfer_address, transfer::sender::{TransferSenderRequestPayload, TransferSenderResponsePayload, create_transfer_signature}};
use secp256k1_zkp::{PublicKey, Secp256k1, schnorr::Signature};

pub async fn execute(client_config: &ClientConfig, recipient_address: &str, wallet_name: &str, statechain_id: &str) -> Result<()> {

    let mut wallet: mercury_lib::wallet::Wallet = get_wallet(&client_config.pool, &wallet_name).await?;

    let mut backup_transactions = get_backup_txs(&client_config.pool, &statechain_id).await?;

    if backup_transactions.len() == 0 {
        return Err(anyhow!("No backup transaction associated with this statechain ID were found"));
    }

    let qt_backup_tx = backup_transactions.len() as u32;

    backup_transactions.sort_by(|a, b| a.tx_n.cmp(&b.tx_n));

    let new_tx_n = backup_transactions.len() as u32 + 1;

    let coin = wallet.coins.iter_mut().find(|tx| tx.statechain_id == Some(statechain_id.to_string()));

    if coin.is_none() {
        return Err(anyhow!("No coins associated with this statechain ID were found"));
    }

    let coin = coin.unwrap();

    if coin.amount.is_none() {
        return Err(anyhow::anyhow!("coin.amount is None"));
    }

    let bkp_tx1 = &backup_transactions[0];

    let signed_tx = create_backup_tx_to_receiver(client_config, coin, bkp_tx1, recipient_address, qt_backup_tx, &wallet.network).await?;

    println!("signed_tx: {}", signed_tx);

    let statechain_id = coin.statechain_id.as_ref().unwrap();
    let signed_statechain_id = coin.signed_statechain_id.as_ref().unwrap();
    let new_auth_pubkey = coin.auth_pubkey.as_ref();

    let x1 = get_new_x1(&client_config,  statechain_id, signed_statechain_id, new_auth_pubkey).await?;

    println!("x1: {}", x1);

    let backup_tx = BackupTx {
        tx_n: new_tx_n,
        tx: signed_tx.clone(),
        client_public_nonce: coin.public_nonce.as_ref().unwrap().to_string(),
        blinding_factor: coin.blinding_factor.as_ref().unwrap().to_string(),
    };

    backup_transactions.push(backup_tx);

    let input_txid = coin.utxo_txid.as_ref().unwrap();
    let input_vout = coin.utxo_vout.unwrap();
    let client_seckey = coin.user_privkey.as_ref();

    println!("recipient_address: {}", recipient_address);

    let transfer_signature = create_transfer_signature(recipient_address, input_txid, input_vout, client_seckey)?; 

    println!("transfer_signature: {}", transfer_signature);

    Ok(())
}

async fn create_backup_tx_to_receiver(client_config: &ClientConfig, coin: &mut Coin, bkp_tx1: &BackupTx, recipient_address: &str, qt_backup_tx: u32, network: &str) -> Result<String> {

    let block_height = Some(get_blockheight(bkp_tx1)?);

    let is_withdrawal = false;
    let signed_tx = new_transaction(client_config, coin, recipient_address, qt_backup_tx, is_withdrawal, block_height, network).await?;

    Ok(signed_tx)
}

async fn get_new_x1(client_config: &ClientConfig,  statechain_id: &str, signed_statechain_id: &str, new_auth_pubkey: &str) -> Result<String> {
    
    let endpoint = client_config.statechain_entity.clone();
    let path = "transfer/sender";

    let client = reqwest::Client::new();
    let request = client.post(&format!("{}/{}", endpoint, path));

    let transfer_sender_request_payload = TransferSenderRequestPayload {
        statechain_id: statechain_id.to_string(),
        auth_sig: signed_statechain_id.to_string(),
        new_user_auth_key: new_auth_pubkey.to_string(),
        batch_id: None,
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

    // let x1 = hex::decode(response.x1).unwrap();

    Ok(response.x1)
}


