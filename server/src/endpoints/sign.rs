use mercurylib::transaction::SignFirstRequestPayload;
use rocket::{http::Status, response::status, serde::json::Json, State};
use secp256k1_zkp::musig::MusigSession;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};


use crate::server::StateChainEntity;

#[post("/sign/first", format = "json", data = "<sign_first_request_payload>")]
pub async fn sign_first(statechain_entity: &State<StateChainEntity>, sign_first_request_payload: Json<SignFirstRequestPayload>) -> status::Custom<Json<Value>>  {

    let config = crate::server_config::ServerConfig::load();
    
    let statechain_id = sign_first_request_payload.0.statechain_id.clone();

    let statechain_entity = statechain_entity.inner();

    let enclave_index = crate::database::utils::get_enclave_index_from_database(&statechain_entity.pool, &statechain_id).await;

    let enclave_index = match enclave_index {
        Some(index) => index,
        None => {
            let response_body = json!({
                "message": format!("Enclave index for statechain {} ID not found.", statechain_id)
            });
        
            return status::Custom(Status::InternalServerError, Json(response_body));
        }
    };

    let enclave_index = enclave_index as usize;

    let lockbox_endpoint = config.enclaves.get(enclave_index).unwrap().url.clone();
    let path = "get_public_nonce";

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.post(&format!("{}/{}", lockbox_endpoint, path));

    let signed_statechain_id = sign_first_request_payload.0.signed_statechain_id.clone();

    if !crate::endpoints::utils::validate_signature(&statechain_entity.pool, &signed_statechain_id, &statechain_id).await {

        let response_body = json!({
            "message": "Signature does not match authentication key."
        });
    
        return status::Custom(Status::Unauthorized, Json(response_body));
    }

    // This situation should not happen, as this state is only possible if the client has called signFirst, but not signSecond
    // In this case, the server should have already stored server_pubnonce in the database and the challenge is still null because the client did not call signSecond
    let server_pubnonce_hex = crate::database::sign::get_server_pubnonce_from_null_challenge(&statechain_entity.pool, &statechain_id).await;

    if server_pubnonce_hex.is_some() {

        let response = mercurylib::transaction::SignFirstResponsePayload {
            server_pubnonce: server_pubnonce_hex.unwrap(),
        };

        let response_body = json!(response);
    
        return status::Custom(Status::Ok, Json(response_body));
    }

    let value = match request.json(&sign_first_request_payload.0).send().await {
        Ok(response) => {
            let text = response.text().await.unwrap();
            text
        },
        Err(err) => {
            let response_body = json!({
                "error": "Internal Server Error",
                "message": err.to_string()
            });
        
            return status::Custom(Status::InternalServerError, Json(response_body));
        },
    };

    let response: mercurylib::transaction::SignFirstResponsePayload = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));

    let mut server_pubnonce_hex = response.server_pubnonce.clone();

    if server_pubnonce_hex.starts_with("0x") {
        server_pubnonce_hex = server_pubnonce_hex[2..].to_string();
    }

    crate::database::sign::insert_new_signature_data(&statechain_entity.pool, &server_pubnonce_hex, &statechain_id,).await;

    let response_body = json!(response);

    return status::Custom(Status::Ok, Json(response_body));
}

#[post("/sign/second", format = "json", data = "<partial_signature_request_payload>")]
pub async fn sign_second (statechain_entity: &State<StateChainEntity>, partial_signature_request_payload: Json<mercurylib::transaction::PartialSignatureRequestPayload>) -> status::Custom<Json<Value>>  {
    
    let statechain_id = partial_signature_request_payload.0.statechain_id.clone();

    let statechain_entity = statechain_entity.inner();

    let config = crate::server_config::ServerConfig::load();

    let enclave_index = crate::database::utils::get_enclave_index_from_database(&statechain_entity.pool, &statechain_id).await;

    let enclave_index = match enclave_index {
        Some(index) => index,
        None => {
            let response_body = json!({
                "message": format!("Enclave index for statechain {} ID not found.", statechain_id)
            });
        
            return status::Custom(Status::InternalServerError, Json(response_body));
        }
    };

    let enclave_index = enclave_index as usize;

    let lockbox_endpoint = config.enclaves.get(enclave_index).unwrap().url.clone();
    let path = "get_partial_signature";

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.post(&format!("{}/{}", lockbox_endpoint, path));

    let signed_statechain_id = partial_signature_request_payload.0.signed_statechain_id.clone();

    if !crate::endpoints::utils::validate_signature(&statechain_entity.pool, &signed_statechain_id, &statechain_id).await {

        let response_body = json!({
            "message": "Signature does not match authentication key."
        });
    
        return status::Custom(Status::Unauthorized, Json(response_body));
    }

    let partial_signature_request_payload = partial_signature_request_payload.0.clone(); 
    let session = partial_signature_request_payload.session.clone();
    let server_pub_nonce = partial_signature_request_payload.server_pub_nonce.clone();

    let session_bytes: [u8; 133] = hex::decode(&session).unwrap().try_into().unwrap();
    let session = MusigSession::from_slice(session_bytes);
    let challenge = session.get_challenge_from_session();
    let challenge_str = hex::encode(challenge);

    crate::database::sign::update_signature_data_challenge(&statechain_entity.pool, &server_pub_nonce, &challenge_str, &statechain_id).await;

    let value = match request.json(&partial_signature_request_payload).send().await {
        Ok(response) => {
            let text = response.text().await.unwrap();
            text
        },
        Err(err) => {
            let response_body = json!({
                "error": "Internal Server Error",
                "message": err.to_string()
            });
        
            return status::Custom(Status::InternalServerError, Json(response_body));
        },
    };

    #[derive(Serialize, Deserialize, Debug, Clone)]
    pub struct PartialSignatureResponsePayload<'r> {
        partial_sig: &'r str,
    }

    let response: PartialSignatureResponsePayload = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));

    let response_body = json!(response);

    return status::Custom(Status::Ok, Json(response_body));
}
   