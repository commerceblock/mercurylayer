use std::str::FromStr;

use bitcoin::hashes::sha256;
use rocket::{State, response::status, http::Status, serde::json::Json};
use secp256k1_zkp::{schnorr::Signature, Message, Secp256k1, XOnlyPublicKey, PublicKey};
use serde_json::{json, Value};
use sqlx::Row;

use crate::server::StateChainEntity;

async fn get_auth_key_by_statechain_id(pool: &sqlx::PgPool, statechain_id: &str) -> Result<XOnlyPublicKey, sqlx::Error> {

    let row = sqlx::query(
        "SELECT auth_xonly_public_key \
        FROM public.key_data \
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

    let response_body = json!({
        "interval": statechain_entity.config.lh_decrement,
        "initlock": statechain_entity.config.lockheight_init,
    });

    return status::Custom(Status::Ok, Json(response_body));
}

struct StatechainInfo {
    r2_commitment: String,
    blind_commitment: String,
    server_pubkey: PublicKey,
}

async fn get_statechain_info(pool: &sqlx::PgPool, statechain_id: &str) -> Result<StatechainInfo, sqlx::Error> {

        let row = sqlx::query(
            "SELECT r2_commitment, blind_commitment, server_public_key \
            FROM public.key_data \
            WHERE statechain_id = $1")
            .bind(&statechain_id)
            .fetch_one(pool)
            .await;

        match row {
            Ok(row) => {
                let r2_commitment = row.get::<Option<String>, _>("r2_commitment");
                let blind_commitment = row.get::<Option<String>, _>("blind_commitment");

                let server_public_key_bytes = row.get::<Vec<u8>, _>("server_public_key");
                let server_pubkey = PublicKey::from_slice(&server_public_key_bytes).unwrap();

                return Ok(StatechainInfo {
                    r2_commitment: r2_commitment.unwrap(),
                    blind_commitment: blind_commitment.unwrap(),
                    server_pubkey,
                });
            },
            Err(err) => {
                return Err(err);
            }
        };
}

#[get("/info/statechain/<statechain_id>")]
pub async fn statechain_info(statechain_entity: &State<StateChainEntity>, statechain_id: String) -> status::Custom<Json<Value>> {

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

    let statechain_info = get_statechain_info(&statechain_entity.pool, &statechain_id).await.unwrap();

    let response: Value = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));
    let response_body = json!({
        "statechain_id": statechain_id,
        "signature_count": response["sig_count"],
        "r2_commitment": statechain_info.r2_commitment,
        "blind_commitment": statechain_info.blind_commitment,
        "server_pubkey": statechain_info.server_pubkey.to_string(),
    });

    // {pubkey, num_sigs, blind_commits, r2_commits, r1_values, blind_challenges}

    return status::Custom(Status::Ok, Json(response_body));
}