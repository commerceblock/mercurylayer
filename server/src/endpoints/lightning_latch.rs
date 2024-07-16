use std::str::FromStr;

use chrono::Duration;
use mercurylib::transfer::sender::{PaymentHashRequestPayload, PaymentHashResponsePayload, TransferPreimageRequestPayload, TransferPreimageResponsePayload};
use rand::Rng;
use rocket::{State, serde::json::Json, response::status, http::Status};
use secp256k1_zkp::PublicKey;
use serde_json::{json, Value};

use sha2::{Sha256, Digest};

use crate::server::StateChainEntity;

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

    let sender_auth_key = super::utils::get_auth_key_by_statechain_id(&statechain_entity.pool, &statechain_id).await.unwrap();

    let buffer = rand::thread_rng().gen::<[u8; 32]>();
    let pre_image = hex::encode(buffer.clone());

    let now = chrono::Utc::now();
    let expiry_time = Duration::seconds(90000); // 25h
    let expires_at = now + expiry_time;

    crate::database::lightning_latch::insert_paymenthash(&statechain_entity.pool, &statechain_id, &sender_auth_key, &batch_id, &pre_image, &expires_at).await;

    let mut hasher = Sha256::new();
    hasher.update(buffer);
    let result = hasher.finalize();

    let payment_hash = hex::encode(result);

    let payment_hash_response_payload = PaymentHashResponsePayload {
        hash: payment_hash,
    };

    let response_body = json!(payment_hash_response_payload);

    return status::Custom(Status::Ok, Json(response_body));
    
}


#[post("/transfer/transfer_preimage", format = "json", data = "<transfer_preimage_request_payload>")]
pub async fn transfer_preimage(statechain_entity: &State<StateChainEntity>, transfer_preimage_request_payload: Json<TransferPreimageRequestPayload>) -> status::Custom<Json<Value>>  {

    let statechain_id = transfer_preimage_request_payload.0.statechain_id.clone();
    let signed_statechain_id = transfer_preimage_request_payload.0.auth_sig.clone();
    let previous_user_auth_key = transfer_preimage_request_payload.0.previous_user_auth_key.clone();
    let batch_id = transfer_preimage_request_payload.0.batch_id.clone();

    if !crate::endpoints::utils::validate_signature_given_public_key(&signed_statechain_id, &statechain_id, &previous_user_auth_key).await {

        let response_body = json!({
            "message": "Signature does not match authentication key."
        });
    
        return status::Custom(Status::Forbidden, Json(response_body));
    }

    let previous_user_auth_key = PublicKey::from_str(&previous_user_auth_key).unwrap();
    let previous_user_auth_key = previous_user_auth_key.x_only_public_key().0;

    let pre_image = crate::database::lightning_latch::get_preimage(&statechain_entity.pool, &statechain_id, &previous_user_auth_key, &batch_id).await;

    if pre_image.is_none() {
        let message = format!("Pre-image for statechain {} not available. The transaction may still be locked", statechain_id);
        let response_body = json!({
            "message": message
        });

        return status::Custom(Status::NotFound, Json(response_body));
    }

    let pre_image = pre_image.unwrap();

    let response_body = json!(TransferPreimageResponsePayload {
        preimage: pre_image
    });

    return status::Custom(Status::Ok, Json(response_body));

}
