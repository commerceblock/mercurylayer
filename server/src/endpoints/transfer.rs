use std::str::FromStr;

use rocket::{State, serde::json::Json, response::status, http::Status};
use secp256k1_zkp::PublicKey;
use serde::{Serialize, Deserialize};
use serde_json::{Value, json};

use crate::server::StateChainEntity;

#[derive(Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct TransferSenderequestPayload {
    statechain_id: String,
    auth_sig: String, // signed_statechain_id
    new_user_auth_key: String,
    batch_id: Option<String>,
}

async fn insert_new_transfer(pool: &sqlx::PgPool, new_user_auth_key: &PublicKey, x1: &[u8; 32], statechain_id: &String)  {

    let query = "INSERT INTO statechain_transfer (statechain_id, auth_xonly_public_key, x1) VALUES ($1, $2, $3)";

    let _ = sqlx::query(query)
        .bind(statechain_id)
        .bind(&new_user_auth_key.serialize())
        .bind(x1)
        .execute(pool)
        .await
        .unwrap();
}

#[post("/transfer/sender", format = "json", data = "<transfer_sender_request_payload>")]
pub async fn transfer_sender(statechain_entity: &State<StateChainEntity>, transfer_sender_request_payload: Json<TransferSenderequestPayload>) -> status::Custom<Json<Value>>  {

    let statechain_id = transfer_sender_request_payload.0.statechain_id.clone();
    let signed_statechain_id = transfer_sender_request_payload.0.auth_sig.clone();

    if !crate::endpoints::utils::validate_signature(&statechain_entity.pool, &signed_statechain_id, &statechain_id).await {

        let response_body = json!({
            "error": "Internal Server Error",
            "message": "Signature does not match authentication key."
        });
    
        return status::Custom(Status::InternalServerError, Json(response_body));
    }

    let new_user_auth_key = PublicKey::from_str(&transfer_sender_request_payload.0.new_user_auth_key).unwrap();

    let mut x1 = [0u8; 32];  // 256 bits
    rand::RngCore::fill_bytes(&mut rand::thread_rng(), &mut x1);

    insert_new_transfer(&statechain_entity.pool, &new_user_auth_key, &x1, &statechain_id).await;

    let response_body = json!({
        "x1": hex::encode(x1),
    });

    return status::Custom(Status::Ok, Json(response_body));
}
