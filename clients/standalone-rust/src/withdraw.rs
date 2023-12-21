use bitcoin::Address;

use crate::{electrum, error::CError, client_config::ClientConfig};

pub async fn execute(client_config: &ClientConfig, statechain_id: &str, to_address: &Address, fee_rate: u64) -> Result<String, CError> {
    
    let block_header = electrum::block_headers_subscribe_raw(&client_config.electrum_client);
    let block_height = block_header.height;

    let coin_key_details = client_config.get_coin_and_key_info(statechain_id).await;
    
    let (tx, client_pub_nonce, server_pub_nonce, blinding_factor) = crate::transaction::new_backup_transaction(
        client_config,         
        block_height as u32,
        &statechain_id,
        &coin_key_details.signed_statechain_id,
        &coin_key_details.client_seckey,
        &coin_key_details.client_pubkey,
        &coin_key_details.server_pubkey,
        coin_key_details.utxo_tx_hash, 
        coin_key_details.utxo_vout, 
        &coin_key_details.aggregated_pubkey, 
        &coin_key_details.p2tr_agg_address.script_pubkey(), 
        coin_key_details.amount,
        &to_address,
        true).await.unwrap();

    let tx_bytes = bitcoin::consensus::encode::serialize(&tx);

    client_config.insert_transaction(
        coin_key_details.new_tx_n,
        &tx_bytes, 
        &client_pub_nonce.serialize(), 
        &server_pub_nonce.serialize(), 
        &coin_key_details.client_pubkey, 
        &coin_key_details.server_pubkey, 
        blinding_factor.as_bytes(), 
        &statechain_id, 
        &to_address.to_string()
    ).await.unwrap();

    let txid = electrum::transaction_broadcast_raw(&client_config.electrum_client, &tx_bytes);

    client_config.update_coin_status_and_tx_withdraw(statechain_id, "WITHDRAWN", Some(txid.to_string())).await;

    // delete statechain on the server
    let delete_statechain_payload = mercury_lib::withdraw::DeleteStatechainPayload {
        statechain_id: statechain_id.to_string(),
        signed_statechain_id: coin_key_details.signed_statechain_id.to_string(),
    };

    let endpoint = client_config.statechain_entity.clone();
    let path = "delete_statechain";

    let tor_proxy = client_config.tor_proxy.clone();

    let mut client: reqwest::Client = reqwest::Client::new();
    if tor_proxy != "".to_string() {
        let tor_proxy = reqwest::Proxy::all(tor_proxy).unwrap();
        client = reqwest::Client::builder().proxy(tor_proxy).build().unwrap();
    }
    let request = client.delete(&format!("{}/{}", endpoint, path));

    let _ = match request.json(&delete_statechain_payload).send().await {
        Ok(response) => {
            let text = response.text().await.unwrap();
            text
        },
        Err(err) => {
            return Err(CError::Generic(err.to_string()));
        },
    };

    Ok(txid.to_string())
    
}