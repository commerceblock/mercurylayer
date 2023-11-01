use mercury_lib::transaction::{SignFirstRequestPayload, PartialSignatureMsg1, PartialSignatureRequestPayload, PartialSignatureResponsePayload};
use anyhow::Result;
use secp256k1_zkp::musig::MusigPartialSignature;
use crate::client_config::ClientConfig;

/// This function gets the server public nonce from the statechain entity.
pub async fn sign_first(client_config: &ClientConfig, sign_first_request_payload: &SignFirstRequestPayload) -> Result<String> {

    let endpoint = client_config.statechain_entity.clone();
    let path = "sign/first";

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.post(&format!("{}/{}", endpoint, path));

    let value = request.json(&sign_first_request_payload).send().await?.text().await?;

    let sign_first_response_payload: mercury_lib::transaction::SignFirstResponsePayload = serde_json::from_str(value.as_str())?;

    let mut server_pubnonce_hex = sign_first_response_payload.server_pubnonce.to_string();

    if server_pubnonce_hex.starts_with("0x") {
        server_pubnonce_hex = server_pubnonce_hex[2..].to_string();
    }

    Ok(server_pubnonce_hex)
}

pub async fn get_server_partial_sig(client_config: &ClientConfig, partial_sig_request: &PartialSignatureRequestPayload) -> Result<MusigPartialSignature> {
    let endpoint = client_config.statechain_entity.clone();
    let path = "sign/second";

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.post(&format!("{}/{}", endpoint, path));

    let value = request.json(&partial_sig_request).send().await?.text().await?;

    let response: PartialSignatureResponsePayload = serde_json::from_str(value.as_str())?;

    let mut server_partial_sig_hex = response.partial_sig.to_string();

    if server_partial_sig_hex.starts_with("0x") {
        server_partial_sig_hex = server_partial_sig_hex[2..].to_string();
    }

    let server_partial_sig_bytes = hex::decode(server_partial_sig_hex)?;

    let server_partial_sig = MusigPartialSignature::from_slice(server_partial_sig_bytes.as_slice())?;

    Ok(server_partial_sig)
}