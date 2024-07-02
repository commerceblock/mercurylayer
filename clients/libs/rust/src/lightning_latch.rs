
use crate::{client_config::ClientConfig, sqlite_manager::get_wallet};
use anyhow::{anyhow, Result};
use mercurylib::transfer::sender::{PaymentHashRequestPayload, PaymentHashResponsePayload};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct CreatePreImageResponse {
    pub pre_image: String,
    pub batch_id: String,
}

pub async fn create_pre_image(
    client_config: &ClientConfig, 
    wallet_name: &str, 
    statechain_id: &str) -> Result<CreatePreImageResponse> 
{
    let batch_id = Some(uuid::Uuid::new_v4().to_string()).unwrap();

    let mut wallet: mercurylib::wallet::Wallet = get_wallet(&client_config.pool, &wallet_name).await?;

    let coin = wallet.coins
        .iter_mut()
        .filter(|tx| tx.statechain_id == Some(statechain_id.to_string())) // Filter coins with the specified statechain_id
        .min_by_key(|tx| tx.locktime.unwrap_or(u32::MAX)); // Find the one with the lowest locktime

    if coin.is_none() {
        return Err(anyhow!("No coins associated with this statechain ID were found"));
    }

    let coin = coin.unwrap();

    let signed_statechain_id = coin.signed_statechain_id.as_ref().unwrap();

    let payment_hash_payload = PaymentHashRequestPayload {
        statechain_id: statechain_id.to_string(),
        auth_sig: signed_statechain_id.to_string(),
        batch_id: batch_id.clone(),
    };

    let endpoint = client_config.statechain_entity.clone();
    let path = "transfer/paymenthash";

    let client = client_config.get_reqwest_client()?;
    let request = client.post(&format!("{}/{}", endpoint, path));

    let response = request.json(&payment_hash_payload).send().await?;

    if response.status() != 200 {
        let response_body = response.text().await?;
        return Err(anyhow!(response_body));
    }

    let value = response.text().await?;

    let payment_hash_response_payload: PaymentHashResponsePayload = serde_json::from_str(value.as_str())?;

    Ok(CreatePreImageResponse {
        pre_image: payment_hash_response_payload.hash,
        batch_id,
    })
}

pub async fn confirm_pending_invoice(client_config: &ClientConfig, wallet_name: &str, statechain_id: &str) -> Result<()> {

    let mut wallet: mercurylib::wallet::Wallet = get_wallet(&client_config.pool, &wallet_name).await?;

    let coin = wallet.coins
        .iter_mut()
        .filter(|tx| tx.statechain_id == Some(statechain_id.to_string())) // Filter coins with the specified statechain_id
        .min_by_key(|tx| tx.locktime.unwrap_or(u32::MAX)); // Find the one with the lowest locktime

    if coin.is_none() {
        return Err(anyhow!("No coins associated with this statechain ID were found"));
    }

    let coin = coin.unwrap();

    let signed_statechain_id = coin.signed_statechain_id.as_ref().unwrap();

    let path = "transfer/unlock";

    let client = client_config.get_reqwest_client()?;
    let request = client.post(&format!("{}/{}", client_config.statechain_entity, path));

    let transfer_unlock_request_payload = mercurylib::transfer::receiver::TransferUnlockRequestPayload {
        statechain_id: statechain_id.to_string(),
        auth_sig: signed_statechain_id.to_string(),
        auth_pub_key: None,
    };

    let status = request.json(&transfer_unlock_request_payload).send().await?.status();

    if !status.is_success() {
        return Err(anyhow::anyhow!("Failed to update transfer message".to_string()));
    }

    Ok(())
}
