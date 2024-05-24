use std::str::FromStr;

use bitcoin::hashes::sha256;
use rocket::{State, response::status, http::Status, serde::json::Json};
use secp256k1_zkp::{schnorr::Signature, Message, Secp256k1, XOnlyPublicKey};
use serde_json::{json, Value};
use sqlx::Row;
use secp256k1_zkp::PublicKey;

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

pub async fn validate_signature_given_public_key(signed_message_hex: &str, statechain_id: &str, auth_key: &str) -> bool {

    let auth_key = PublicKey::from_str(auth_key).unwrap().x_only_public_key().0;

    let signed_message = Signature::from_str(signed_message_hex).unwrap();
    let msg = Message::from_hashed_data::<sha256::Hash>(statechain_id.to_string().as_bytes());

    let secp = Secp256k1::new();
    secp.verify_schnorr(&signed_message, &msg, &auth_key).is_ok()
}

pub async fn validate_signature(pool: &sqlx::PgPool, signed_message_hex: &str, statechain_id: &str) -> bool {

    let auth_key = get_auth_key_by_statechain_id(pool, statechain_id).await.unwrap();

    let signed_message = Signature::from_str(signed_message_hex).unwrap();
    let msg = Message::from_hashed_data::<sha256::Hash>(statechain_id.to_string().as_bytes());

    let secp = Secp256k1::new();
    secp.verify_schnorr(&signed_message, &msg, &auth_key).is_ok()
}

#[get("/info/config")]
pub async fn info_config(statechain_entity: &State<StateChainEntity>) -> status::Custom<Json<Value>> {
    let statechain_entity = statechain_entity.inner();

    let server_config = mercurylib::utils::ServerConfig {
        initlock: statechain_entity.config.lockheight_init,
        interval: statechain_entity.config.lh_decrement,
    };

    let response_body = json!(server_config);

    return status::Custom(Status::Ok, Json(response_body));
}

#[get("/info/keylist")]
pub async fn info_keylist(statechain_entity: &State<StateChainEntity>) -> status::Custom<Json<Value>> {

    let query = "\
    SELECT server_public_key, statechain_id \
    FROM statechain_data";  

    let rows = sqlx::query(query)
    .fetch_all(&statechain_entity.pool)
    .await
    .unwrap();

    let query_sigs = "\
    SELECT tx_n, statechain_id, created_at::TEXT \
    FROM statechain_signature_data";  

    let rows_sigs = sqlx::query(query_sigs)
    .fetch_all(&statechain_entity.pool)
    .await
    .unwrap();

    let mut result = Vec::<mercurylib::utils::PubKeyInfo>::new();

    for row in rows {

        let server_public_key_bytes = row.get::<Vec<u8>, _>(0);
        let server_pubkey = PublicKey::from_slice(&server_public_key_bytes).unwrap();
        let statechain_id: String = row.get(1);

        let mut keyinfo: mercurylib::utils::PubKeyInfo = mercurylib::utils::PubKeyInfo {
            server_pubkey: server_pubkey.to_string(),
            tx_n: 0,
            updated_at: "".to_string(),
        };

        for row_sig in &rows_sigs {
            let tx_n_i: i32 = row_sig.get(0);
            let statechain_id_sig: String = row_sig.get(1);
            let updated_at: String = row_sig.get(2);

            if statechain_id == statechain_id_sig {
                keyinfo.tx_n = tx_n_i as u32;
                keyinfo.updated_at = updated_at;
            }
        }
        result.push(keyinfo);
    }

    let key_list_response_payload = mercurylib::utils::KeyListResponsePayload {
        list_keyinfo:result
    };

    let response_body = json!(key_list_response_payload);

    return status::Custom(Status::Ok, Json(response_body));

}