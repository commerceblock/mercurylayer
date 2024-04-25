use electrum_client::ElectrumApi;
use mercury_lib::{transaction::{SignFirstRequestPayload, PartialSignatureRequestPayload, PartialSignatureResponsePayload, get_partial_sig_request, create_signature, new_backup_transaction}, wallet::Coin};
use anyhow::Result;
use secp256k1_zkp::musig::MusigPartialSignature;
use crate::{client_config::ClientConfig, utils::info_config};

pub async fn new_transaction(client_config: &ClientConfig, coin: &mut Coin, to_address: &str, qt_backup_tx: u32, is_withdrawal: bool, block_height: Option<u32>, network: &str) -> Result<String> {

    // TODO: validate address first

    let coin_nonce = mercury_lib::transaction::create_and_commit_nonces(&coin)?;
    coin.secret_nonce = Some(coin_nonce.secret_nonce);
    coin.public_nonce = Some(coin_nonce.public_nonce);
    coin.blinding_factor = Some(coin_nonce.blinding_factor);

    let server_public_nonce = sign_first(&client_config, &coin_nonce.sign_first_request_payload).await?;

    coin.server_public_nonce = Some(server_public_nonce);

    let server_info = info_config(&client_config).await?;

    let block_height = match block_height {
        Some(block_height) => block_height,
        None => {
            let block_header = client_config.electrum_client.block_headers_subscribe_raw()?;
            block_header.height as u32
        },
    };
           
    let initlock = server_info.initlock;
    let interval = server_info.interval;
    let fee_rate_sats_per_byte = server_info.fee_rate_sats_per_byte as u32;

    let partial_sig_request = get_partial_sig_request(
        &coin, 
        block_height, 
        initlock, 
        interval, 
        fee_rate_sats_per_byte,
        qt_backup_tx,
        to_address.to_string(),
        network.to_string(),
        is_withdrawal)?;

    let server_partial_sig_request = partial_sig_request.partial_signature_request_payload;

    let server_partial_sig = sign_second(&client_config, &server_partial_sig_request).await?;

    let client_partial_sig_hex = partial_sig_request.client_partial_sig;
    let server_partial_sig_hex = hex::encode(server_partial_sig.serialize());
    let msg = partial_sig_request.msg;
    let session_hex = partial_sig_request.encoded_session;
    let output_pubkey_hex = partial_sig_request.output_pubkey;

    let encoded_unsigned_tx = partial_sig_request.encoded_unsigned_tx;
    
    let signature = create_signature(msg, client_partial_sig_hex, server_partial_sig_hex, session_hex, output_pubkey_hex)?;

    let signed_tx = new_backup_transaction(encoded_unsigned_tx, signature)?;

    Ok(signed_tx)
}

/// This function gets the server public nonce from the statechain entity.
pub async fn sign_first(client_config: &ClientConfig, sign_first_request_payload: &SignFirstRequestPayload) -> Result<String> {

    let endpoint = client_config.statechain_entity.clone();
    let path = "sign/first";

    let client = client_config.get_reqwest_client()?;
    let request = client.post(&format!("{}/{}", endpoint, path));

    let value = request.json(&sign_first_request_payload).send().await?.text().await?;

    let sign_first_response_payload: mercury_lib::transaction::SignFirstResponsePayload = serde_json::from_str(value.as_str())?;

    let mut server_pubnonce_hex = sign_first_response_payload.server_pubnonce.to_string();

    if server_pubnonce_hex.starts_with("0x") {
        server_pubnonce_hex = server_pubnonce_hex[2..].to_string();
    }

    Ok(server_pubnonce_hex)
}

pub async fn sign_second(client_config: &ClientConfig, partial_sig_request: &PartialSignatureRequestPayload) -> Result<MusigPartialSignature> {
    let endpoint = client_config.statechain_entity.clone();
    let path = "sign/second";

    let client = client_config.get_reqwest_client()?;
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