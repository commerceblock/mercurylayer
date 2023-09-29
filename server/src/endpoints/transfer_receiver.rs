use std::str::FromStr;

use rocket::{State, response::status, serde::json::Json, http::Status};
use secp256k1_zkp::PublicKey;
use serde_json::{Value, json};
use sqlx::Row;

use crate::server::StateChainEntity;

async fn get_transfer_messages(pool: &sqlx::PgPool, new_user_auth_key: &PublicKey) -> Vec::<String> {

    let query = "\
        SELECT encrypted_transfer_msg \
        FROM statechain_transfer \
        WHERE new_user_auth_public_key = $1
        AND encrypted_transfer_msg IS NOT NULL";

    let rows = sqlx::query(query)
        .bind(new_user_auth_key.serialize())
        .fetch_all(pool)
        .await
        .unwrap();

    let mut result = Vec::<String>::new();

    for row in rows {
        let encrypted_transfer_msg: Vec<u8> = row.get(0);
        result.push(hex::encode(encrypted_transfer_msg));
    }

    result
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
    
    let result = get_transfer_messages(&statechain_entity.pool, &new_user_auth_public_key).await;

/*     if result.len() == 0 {
        let response_body = json!({
            "error": "Not Found",
            "message": "No transfer messages found"
        });
    
        return status::Custom(Status::NotFound, Json(response_body));
    } */

    let response_body = json!({
        "list_enc_transfer_msg": result
    });

    return status::Custom(Status::Ok, Json(response_body));
}