use std::str::FromStr;

use rocket::{State, serde::json::Json, response::status, http::Status};
use secp256k1_zkp::{PublicKey, Scalar, SecretKey};
use serde::{Serialize, Deserialize};
use serde_json::{Value, json};
use sqlx::Row;

use crate::server::StateChainEntity;

#[derive(Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct TransferSenderequestPayload {
    statechain_id: String,
    auth_sig: String, // signed_statechain_id
    new_user_auth_key: String,
    batch_id: Option<String>,
}

async fn exists_msg_for_same_statechain_id_and_new_user_auth_key(pool: &sqlx::PgPool, new_user_auth_key: &PublicKey, statechain_id: &str) -> bool {

    let query = "\
        SELECT COUNT(*) \
        FROM statechain_transfer \
        WHERE new_user_auth_public_key = $1 AND statechain_id = $2";

    let row = sqlx::query(query)
        .bind(&new_user_auth_key.serialize())
        .bind(statechain_id)
        .fetch_one(pool)
        .await
        .unwrap();

    let count: i64 = row.get(0);

    count > 0
}

async fn insert_new_transfer(transaction: &mut sqlx::Transaction<'_, sqlx::Postgres>, new_user_auth_key: &PublicKey, x1: &[u8; 32], statechain_id: &String)  {

    let query1 = "DELETE FROM statechain_transfer WHERE statechain_id = $1";

    let _ = sqlx::query(query1)
        .bind(statechain_id)
        .execute(&mut **transaction)
        .await
        .unwrap();

    let query2 = "INSERT INTO statechain_transfer (statechain_id, new_user_auth_public_key, x1) VALUES ($1, $2, $3)";

    let _ = sqlx::query(query2)
        .bind(statechain_id)
        .bind(&new_user_auth_key.serialize())
        .bind(x1)
        .execute(&mut **transaction)
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

    if exists_msg_for_same_statechain_id_and_new_user_auth_key(&statechain_entity.pool, &new_user_auth_key, &statechain_id).await {

        let response_body = json!({
            "error": "Internal Server Error",
            "message": "Transfer message already exists for this statechain_id and new_user_auth_key."
        });
    
        return status::Custom(Status::BadRequest, Json(response_body));
    }

    let secret_x1 = SecretKey::new(&mut rand::thread_rng());

    let s_x1 = Scalar::from(secret_x1);
    let x1 = s_x1.to_be_bytes();

    let mut transaction = statechain_entity.pool.begin().await.unwrap();

    insert_new_transfer(&mut transaction, &new_user_auth_key, &x1, &statechain_id).await;

    transaction.commit().await.unwrap();

    let response_body = json!({
        "x1": hex::encode(x1),
    });

    return status::Custom(Status::Ok, Json(response_body));
}

#[derive(Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct TransferUpdateMsgRequestPayload {
    statechain_id: String,
    auth_sig: String, // signed_statechain_id
    new_user_auth_key: String,
    enc_transfer_msg: String,
}

async fn update_transfer_msg(pool: &sqlx::PgPool, new_user_auth_key: &PublicKey, enc_transfer_msg: &Vec<u8>, statechain_id: &str)  {

    let query = "\
        UPDATE statechain_transfer \
        SET encrypted_transfer_msg = $1, updated_at = NOW() \
        WHERE \
            statechain_id = $2 AND \
            new_user_auth_public_key = $3 AND \
            updated_at = (SELECT MAX(updated_at) FROM statechain_transfer WHERE statechain_id = $2)";

    let _ = sqlx::query(query)
        .bind(enc_transfer_msg)
        .bind(statechain_id)
        .bind(&new_user_auth_key.serialize())
        .execute(pool)
        .await
        .unwrap();
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

    update_transfer_msg(&statechain_entity.pool, &new_user_auth_key, &enc_transfer_msg, &statechain_id).await;

    let response_body = json!({
        "updated": true,
    });

    return status::Custom(Status::Ok, Json(response_body));
}