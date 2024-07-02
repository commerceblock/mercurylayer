use bitcoin::hashes::Hash;
use chrono::Duration;
use hex::encode;
use mercurylib::transfer::sender::{PaymentHashRequestPayload, PaymentHashResponsePayload};
use rand::Rng;
use rocket::{State, serde::json::Json, response::status, http::Status};
use serde_json::{json, Value};

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
    let pre_image = encode(&buffer.clone());

    let now = chrono::Utc::now();
    let expiry_time = Duration::seconds(90000); // 25h
    let expires_at = now + expiry_time;

    crate::database::lightning_latch::insert_paymenthash(&statechain_entity.pool, &statechain_id, &sender_auth_key, &batch_id, &pre_image, &expires_at).await;

    let result_hash = bitcoin::hashes::sha256::Hash::from_slice(&buffer).unwrap();
    let hash_bytes = result_hash.as_byte_array();
    let payment_hash = encode(hash_bytes);

    let payment_hash_response_payload = PaymentHashResponsePayload {
        hash: payment_hash,
    };

    let response_body = json!(payment_hash_response_payload);

    return status::Custom(Status::Ok, Json(response_body));
    
}
