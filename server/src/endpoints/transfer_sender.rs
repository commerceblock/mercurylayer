use std::str::FromStr;

use bitcoin::hashes::Hash;
use hex::encode;
use mercurylib::transfer::sender::{PaymentHashRequestPayload, PaymentHashResponsePayload, TransferSenderRequestPayload, TransferSenderResponsePayload, TransferUpdateMsgRequestPayload};
use rand::Rng;
use rocket::{State, serde::json::Json, response::status, http::Status};
use secp256k1_zkp::{PublicKey, Scalar, SecretKey};
use serde_json::{Value, json};

use crate::server::StateChainEntity;

use super::is_batch_expired;

/// Enun to represent the possible results of the batch transfer validation
pub enum BatchTransferValidationResult {

    /// The statecoin batch is locked (not expired yet)
    StatecoinBatchLockedError (String),
    /// The batch_id sent by the user is expired
    ExpiredBatchTimeError (String),
    /// Success means there is no batch_id for the statecoin, 
    /// or the batch is complete or expired and the batch_id is different from the new_batch_id (or null)
    Success,
}

pub async fn validate_batch_transfer(statechain_entity: &State<StateChainEntity>, statechain_id: &str, new_batch_id: &Option<String>) -> BatchTransferValidationResult {

    // get an extistent batch according to the statecoin, in case the user sent a repeated statecoin
    let batch_info = crate::database::transfer::get_batch_id_and_time_by_statechain_id(&statechain_entity.pool, &statechain_id).await;

    if batch_info.is_some() {

        let (batch_id, batch_time) = batch_info.unwrap();

        if !is_batch_expired(batch_time) {

            // TODO: check if the batch is complete. If complete, should return success.

            // the batch time has not expired
            return BatchTransferValidationResult::StatecoinBatchLockedError("Statecoin batch locked (the batch time has not expired).".to_string())
        } else {
            // the batch time has expired
            if new_batch_id.is_some() && new_batch_id.as_ref().unwrap().to_string() == batch_id {
                // if the new_batch_id is the same should return error
                return BatchTransferValidationResult::ExpiredBatchTimeError("Batch time has expired. Try a new batch id.".to_string());
            } else {
                // // if the new_batch_id is None or different should return success
                return BatchTransferValidationResult::Success;
            }
        }
    }

    // here the statecoin has no batch_id
    // then we check if the user sends a existing batch_id, trying to add a new transfer to this batch.
    if new_batch_id.is_some() {
        let new_batch_id = new_batch_id.as_ref().unwrap();
        
        let batch_time = crate::database::transfer_sender::get_batch_time_by_batch_id(&statechain_entity.pool, new_batch_id).await;

        // if the batch_id exists
        if batch_time.is_some() {
            let batch_time = batch_time.unwrap();

            if !is_batch_expired(batch_time) {
                // the batch time has not expired. It is possible to add a new coin to the batch.
                return BatchTransferValidationResult::Success
            } else {
                // the batch time has expired. New coins not allowed.
                return BatchTransferValidationResult::ExpiredBatchTimeError("Batch time has expired. Try a new batch id.".to_string());
            }
        }
    }

    // if the statecoin has no batch_id should return success
    BatchTransferValidationResult::Success
    
}

#[post("/transfer/paymenthash", format = "json", data = "<payment_hash_payload>")]
pub async fn paymenthash(statechain_entity: &State<StateChainEntity>, payment_hash_payload: Json<PaymentHashRequestPayload>) -> status::Custom<Json<Value>>  {

    let statechain_id = payment_hash_payload.0.statechain_id.clone();
    let signed_statechain_id = payment_hash_payload.0.auth_sig.clone();
    let batch_id = payment_hash_payload.0.batch_id.clone();

    if !crate::endpoints::utils::validate_signature(&statechain_entity.pool, &signed_statechain_id, &statechain_id).await {

        let response_body = json!({
            "message": "Signature does not match authentication key."
        });
    
        return status::Custom(Status::InternalServerError, Json(response_body));
    }

    let batch_transfer_validation_result = validate_batch_transfer(&statechain_entity, &statechain_id, &Some(batch_id.clone())).await;

    match batch_transfer_validation_result {
        BatchTransferValidationResult::StatecoinBatchLockedError(message) | BatchTransferValidationResult::ExpiredBatchTimeError(message) => {
            let response_body = json!({
                "message": message
            });
        
            return status::Custom(Status::BadRequest, Json(response_body));
        },
        BatchTransferValidationResult::Success => {
            // nothing to do. continue.
        }
    }

    let buffer = rand::thread_rng().gen::<[u8; 32]>();
    let pre_image = encode(&buffer.clone());

    crate::database::transfer_sender::insert_paymenthash(&statechain_entity.pool, &statechain_id, &batch_id, &pre_image).await;

    let result_hash = bitcoin::hashes::sha256::Hash::from_slice(&buffer).unwrap();
    let hash_bytes = result_hash.as_byte_array();
    let payment_hash = encode(hash_bytes);

    let payment_hash_response_payload = PaymentHashResponsePayload {
        hash: payment_hash,
    };

    let response_body = json!(payment_hash_response_payload);

    return status::Custom(Status::Ok, Json(response_body));
}

#[post("/transfer/sender", format = "json", data = "<transfer_sender_request_payload>")]
pub async fn transfer_sender(statechain_entity: &State<StateChainEntity>, transfer_sender_request_payload: Json<TransferSenderRequestPayload>) -> status::Custom<Json<Value>>  {

    let statechain_id = transfer_sender_request_payload.0.statechain_id.clone();
    let signed_statechain_id = transfer_sender_request_payload.0.auth_sig.clone();
    let batch_id = transfer_sender_request_payload.0.batch_id.clone();

    if !crate::endpoints::utils::validate_signature(&statechain_entity.pool, &signed_statechain_id, &statechain_id).await {

        let response_body = json!({
            "message": "Signature does not match authentication key."
        });
    
        return status::Custom(Status::InternalServerError, Json(response_body));
    }

    let batch_transfer_validation_result = validate_batch_transfer(&statechain_entity, &statechain_id, &batch_id).await;

    match batch_transfer_validation_result {
        BatchTransferValidationResult::StatecoinBatchLockedError(message) | BatchTransferValidationResult::ExpiredBatchTimeError(message) => {
            let response_body = json!({
                "message": message
            });
        
            return status::Custom(Status::BadRequest, Json(response_body));
        },
        BatchTransferValidationResult::Success => {
            // nothing to do. continue.
        }
    }

    let new_user_auth_key = PublicKey::from_str(&transfer_sender_request_payload.0.new_user_auth_key).unwrap();

    if crate::database::transfer_sender::exists_msg_for_same_statechain_id_and_new_user_auth_key(&statechain_entity.pool, &new_user_auth_key, &statechain_id, &batch_id).await {

        let message = if batch_id.is_some() {
            "Transfer message already exists for this statechain_id, new_user_auth_key and batch_id."
        } else {
            "Transfer message already exists for this statechain_id and new_user_auth_key."
        };

        let response_body = json!({
            "message": message
        });
    
        return status::Custom(Status::BadRequest, Json(response_body));
    }

    let secret_x1 = SecretKey::new(&mut rand::thread_rng());

    let s_x1 = Scalar::from(secret_x1);
    let x1 = s_x1.to_be_bytes();

    crate::database::transfer_sender::insert_new_transfer(&statechain_entity.pool, &new_user_auth_key, &x1, &statechain_id, &batch_id).await;

    let transfer_sender_response_payload = TransferSenderResponsePayload {
        x1: hex::encode(x1),
    };

    let response_body = json!(transfer_sender_response_payload);

    return status::Custom(Status::Ok, Json(response_body));
}

#[post("/transfer/update_msg", format = "json", data = "<transfer_update_msg_request_payload>")]
pub async fn transfer_update_msg(statechain_entity: &State<StateChainEntity>, transfer_update_msg_request_payload: Json<TransferUpdateMsgRequestPayload>) -> status::Custom<Json<Value>>  {

    let statechain_id = transfer_update_msg_request_payload.0.statechain_id.clone();
    let signed_statechain_id = transfer_update_msg_request_payload.0.auth_sig.clone();

    if !crate::endpoints::utils::validate_signature(&statechain_entity.pool, &signed_statechain_id, &statechain_id).await {

        let response_body = json!({
            "error": "Internal Server Error",
            "message": "Signature does not match authentication key."
        });
    
        return status::Custom(Status::InternalServerError, Json(response_body));
    }

    let new_user_auth_key = PublicKey::from_str(&transfer_update_msg_request_payload.0.new_user_auth_key).unwrap();
    let enc_transfer_msg_hex =  transfer_update_msg_request_payload.0.enc_transfer_msg;
    let enc_transfer_msg = hex::decode(enc_transfer_msg_hex).unwrap();

    crate::database::transfer_sender::update_transfer_msg(&statechain_entity.pool, &new_user_auth_key, &enc_transfer_msg, &statechain_id).await;

    let response_body = json!({
        "updated": true,
    });

    return status::Custom(Status::Ok, Json(response_body));
}