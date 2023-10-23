use std::str::FromStr;

use bitcoin::hashes::sha256;
use rocket::{State, response::status, http::Status, serde::json::Json};
use secp256k1_zkp::{schnorr::Signature, Message, Secp256k1, XOnlyPublicKey};
use serde_json::{json, Value};
use sqlx::Row;

use crate::server::StateChainEntity;

async fn get_auth_key_by_statechain_id(pool: &sqlx::PgPool, statechain_id: &str) -> Result<XOnlyPublicKey, sqlx::Error> {

    let row = sqlx::query(
        "SELECT auth_xonly_public_key \
        FROM public.statechain_data \
        WHERE statechain_id = $1")
        .bind(&statechain_id)
        .fetch_one(pool)
        .await;

    match row {
        Ok(row) => {
            let public_key_bytes = row.get::<Option<Vec<u8>>, _>("auth_xonly_public_key");
            let pk = XOnlyPublicKey::from_slice(&public_key_bytes.unwrap()).unwrap();
            return Ok(pk);
        },
        Err(err) => {
            return Err(err);
        }
    };

}

pub async fn validate_signature(pool: &sqlx::PgPool, signed_message_hex: &str, statechain_id: &str) -> bool {

    let auth_key = get_auth_key_by_statechain_id(pool, statechain_id).await.unwrap();

    let signed_message = Signature::from_str(signed_message_hex).unwrap();
    let msg = Message::from_hashed_data::<sha256::Hash>(statechain_id.to_string().as_bytes());

    let secp = Secp256k1::new();
    secp.verify_schnorr(&signed_message, &msg, &auth_key).is_ok()
}

#[get("/info/config", format = "json")]
pub async fn info_config(statechain_entity: &State<StateChainEntity>) -> status::Custom<Json<Value>> {
    let statechain_entity = statechain_entity.inner();

    let server_config = mercury_lib::utils::ServerConfig {
        initlock: statechain_entity.config.lockheight_init,
        interval: statechain_entity.config.lh_decrement,
    };

    let response_body = json!(server_config);

    return status::Custom(Status::Ok, Json(response_body));
}
