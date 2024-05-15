use std::str::FromStr;

use bitcoin::hashes::sha256;
use mercurylib::transfer::receiver::{GetMsgAddrResponsePayload, StatechainInfoResponsePayload, TransferReceiverError, TransferReceiverErrorResponsePayload, TransferReceiverPostResponsePayload, TransferReceiverRequestPayload, TransferUnlockRequestPayload};
use rocket::{State, response::status, serde::json::Json, http::Status};
use secp256k1_zkp::{PublicKey, schnorr::Signature, Message, Secp256k1};
use serde_json::{Value, json};

use crate::server::StateChainEntity;

use super::is_batch_expired;

#[get("/info/statechain/<statechain_id>")]
pub async fn statechain_info(statechain_entity: &State<StateChainEntity>, statechain_id: &str) -> status::Custom<Json<Value>> {

    let lockbox_endpoint = statechain_entity.config.lockbox.clone().unwrap();
    let path = "signature_count";

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.get(&format!("{}/{}/{}", lockbox_endpoint, path, statechain_id));

    let value = match request.send().await {
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

    let response: Value = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));
    let num_sigs = response["sig_count"].as_u64().unwrap();

    let statechain_info = crate::database::transfer_receiver::get_statechain_info(&statechain_entity.pool, &statechain_id).await;

    let enclave_public_key = crate::database::transfer_receiver::get_enclave_pubkey(&statechain_entity.pool, &statechain_id).await;
    let x1_pubkey = crate::database::transfer_receiver::get_x1pub(&statechain_entity.pool, &statechain_id).await;

    let mut x1_pub: Option<String> = None;

    if x1_pubkey.is_some() {
        x1_pub = Some(x1_pubkey.unwrap().to_string());
    }

    let statechain_info_response_payload = StatechainInfoResponsePayload {
        enclave_public_key: enclave_public_key.to_string(),
        num_sigs: num_sigs as u32,
        statechain_info,
        x1_pub,
    };
    
    let response_body = json!(statechain_info_response_payload);

    return status::Custom(Status::Ok, Json(response_body));
    
}

#[get("/transfer/get_msg_addr/<new_auth_key>")]
pub async fn get_msg_addr(statechain_entity: &State<StateChainEntity>, new_auth_key: &str) -> status::Custom<Json<Value>>  {

    let new_user_auth_public_key = PublicKey::from_str(new_auth_key);

    if new_user_auth_public_key.is_err() {
        let response_body = json!({
            "error": "Internal Server Error",
            "message": "Invalid authentication public key"
        });
    
        return status::Custom(Status::InternalServerError, Json(response_body));
    }

    let new_user_auth_public_key = new_user_auth_public_key.unwrap();
    
    let result = crate::database::transfer_receiver::get_statechain_transfer_messages(&statechain_entity.pool, &new_user_auth_public_key).await;

    let get_msg_addr_response_payload = GetMsgAddrResponsePayload {
        list_enc_transfer_msg:result
    };

    let response_body = json!(get_msg_addr_response_payload);

    return status::Custom(Status::Ok, Json(response_body));
}

#[post("/transfer/unlock", format = "json", data = "<transfer_unlock_request_payload>")]
pub async fn transfer_unlock(statechain_entity: &State<StateChainEntity>, transfer_unlock_request_payload: Json<TransferUnlockRequestPayload>) -> status::Custom<Json<Value>> {

    let statechain_id = transfer_unlock_request_payload.0.statechain_id.clone();
    let signed_statechain_id = transfer_unlock_request_payload.0.auth_sig.clone();
    let auth_pub_key = transfer_unlock_request_payload.0.auth_pub_key.clone();

    if !crate::endpoints::utils::validate_signature_given_public_key(&signed_statechain_id, &statechain_id, &auth_pub_key).await {

        let response_body = json!({
            "message": "Signature does not match authentication key."
        });
    
        return status::Custom(Status::Forbidden, Json(response_body));
    }

    crate::database::transfer_receiver::update_unlock_transfer(&statechain_entity.pool, &statechain_id).await;

    let response_body = json!({
        "message": "Success"
    });

    status::Custom(Status::Ok, Json(response_body))
}

pub enum BatchTransferReceiveValidationResult {

    /// The statecoin batch is locked (not expired yet and not all coins are unlocked)
    StatecoinBatchLockedError (String),
    /// The batch_id sent by the user is expired
    ExpiredBatchTimeError (String),
    /// Success means there is no batch_id for the statecoin or all the coins of the batch are unlocked.
    Success,
}

pub async fn validate_batch(statechain_entity: &State<StateChainEntity>, statechain_id: &str)  -> BatchTransferReceiveValidationResult{

    let batch_info = crate::database::transfer::get_batch_id_and_time_by_statechain_id(&statechain_entity.pool, statechain_id).await;

    // batch exists
    if batch_info.is_some() {

        let (batch_id, batch_time) = batch_info.unwrap();

        if is_batch_expired(&statechain_entity, batch_time) {
            // the batch time has not expired. It is possible to add a new coin to the batch.
            return BatchTransferReceiveValidationResult::ExpiredBatchTimeError("Batch time has expired".to_string());
        } else {
            
            // batch not expired. Check if all coins are unlocked.
            let all_coins_unlocked = crate::database::transfer_receiver::is_all_coins_unlocked(&statechain_entity.pool, &batch_id).await;

            if all_coins_unlocked {
                return BatchTransferReceiveValidationResult::Success;
            } else {
                return BatchTransferReceiveValidationResult::StatecoinBatchLockedError("Statecoin batch is locked".to_string());
            }
        }
    }

    BatchTransferReceiveValidationResult::Success
}

#[post("/transfer/receiver", format = "json", data = "<transfer_receiver_request_payload>")]
pub async fn transfer_receiver(statechain_entity: &State<StateChainEntity>, transfer_receiver_request_payload: Json<TransferReceiverRequestPayload>) -> status::Custom<Json<Value>> {

    // TODO: check if the statechain_id is within a batch and if it is, check if the batch is still open or expired.
    // If open, check all coins are unlocked. If not, return 400 error.
    // If expired, return 400 error.
    let batch_validation_result = validate_batch(&statechain_entity, &transfer_receiver_request_payload.statechain_id).await;

    match batch_validation_result {
        BatchTransferReceiveValidationResult::StatecoinBatchLockedError(msg) => {

            let response_body = json!(TransferReceiverErrorResponsePayload {
                code: TransferReceiverError::StatecoinBatchLockedError,
                message: msg
            });
        
            return status::Custom(Status::BadRequest, Json(response_body));
        },
        BatchTransferReceiveValidationResult::ExpiredBatchTimeError(msg) => {
            
            let response_body = json!(TransferReceiverErrorResponsePayload {
                code: TransferReceiverError::ExpiredBatchTimeError,
                message: msg
            });
        
            return status::Custom(Status::BadRequest, Json(response_body));
        },
        BatchTransferReceiveValidationResult::Success => {},
    }

    let auth_pubkey_x1 = crate::database::transfer_receiver::get_auth_pubkey_and_x1(&statechain_entity.pool, &transfer_receiver_request_payload.statechain_id).await;

    if auth_pubkey_x1.is_none() {
        let response_body = json!({
            "message": "No transfer messages found for this statechain_id"
        });
    
        return status::Custom(Status::NotFound, Json(response_body));
    }

    let auth_pubkey_x1 = auth_pubkey_x1.unwrap();
    let auth_pubkey = auth_pubkey_x1.0;
    let x1 = auth_pubkey_x1.1;

    let auth_pubkey = auth_pubkey.x_only_public_key().0;

    let statechain_id = transfer_receiver_request_payload.statechain_id.clone();
    let t2 = transfer_receiver_request_payload.t2.clone();
    let auth_sign = transfer_receiver_request_payload.auth_sig.clone();

    let signed_message = Signature::from_str(&auth_sign).unwrap();
    let msg = Message::from_hashed_data::<sha256::Hash>(t2.as_bytes());

    let secp = Secp256k1::new();
    
    if !secp.verify_schnorr(&signed_message, &msg, &auth_pubkey).is_ok() {

        let response_body = json!({
            "message": "Signature does not match authentication key."
        });
    
        return status::Custom(Status::InternalServerError, Json(response_body));

    }

    if crate::database::transfer_receiver::is_key_already_updated(&statechain_entity.pool, &statechain_id).await {

        let server_public_key = crate::database::transfer_receiver::get_server_public_key(&statechain_entity.pool, &statechain_id).await;

        if server_public_key.is_none() {
            let response_body = json!({
                "message": "Server public key not found."
            });
        
            return status::Custom(Status::InternalServerError, Json(response_body));
        }

        let server_public_key = server_public_key.unwrap();

        let response_body = json!({
            "server_pubkey": server_public_key.to_string(),
        });

        return status::Custom(Status::Ok, Json(response_body));
    }

    let x1_hex = hex::encode(x1);

    let key_update_response_payload = mercurylib::transfer::receiver::KeyUpdateResponsePayload { 
        statechain_id: statechain_id.clone(),
        t2,
        x1: x1_hex,
    };


    let lockbox_endpoint = statechain_entity.config.lockbox.clone().unwrap();
    let path = "keyupdate";

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.post(&format!("{}/{}", lockbox_endpoint, path));

    let value = match request.json(&key_update_response_payload).send().await {
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

    let response: TransferReceiverPostResponsePayload = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));

    let mut server_pubkey_hex = response.server_pubkey.clone();

    if server_pubkey_hex.starts_with("0x") {
        server_pubkey_hex = server_pubkey_hex[2..].to_string();
    }

    let server_pubkey = PublicKey::from_str(&server_pubkey_hex).unwrap();

    crate::database::transfer_receiver::update_statechain(&statechain_entity.pool, &auth_pubkey, &server_pubkey, &statechain_id).await;

    let response_body = json!(TransferReceiverPostResponsePayload {
        server_pubkey: server_pubkey.to_string(),
    });

    status::Custom(Status::Ok, Json(response_body))
}
