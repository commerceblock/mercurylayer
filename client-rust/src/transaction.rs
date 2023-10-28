use mercury_lib::transaction::SignFirstRequestPayload;
use anyhow::Result;
use crate::client_config::ClientConfig;

/// This function gets the server public nonce from the statechain entity.
pub async fn sign_first(client_config: &ClientConfig,sign_first_request_payload: &SignFirstRequestPayload) -> Result<String> {

    let endpoint = client_config.statechain_entity.clone();
    let path = "sign/first";

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.post(&format!("{}/{}", endpoint, path));

    let value = request.json(&sign_first_request_payload).send().await?.text().await?;

    let sign_first_response_payload: mercury_lib::transaction::SignFirstResponsePayload = serde_json::from_str(value.as_str())?;

    Ok(sign_first_response_payload.server_pubnonce)
}