use std::str::FromStr;

use bitcoin::hashes::sha256;
use rocket::{State, response::status, serde::json::Json, http::Status};
use secp256k1_zkp::{PublicKey, schnorr::Signature, Message, Secp256k1, XOnlyPublicKey};
use serde::{Serialize, Deserialize};
use serde_json::{Value, json};
use sqlx::Row;

use crate::server::StateChainEntity;

#[derive(Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct StatechainInfo {
    statechain_id: String,
    r2_commitment: String,
    blind_commitment: String,
    server_pubnonce: String,
    challenge: String,
    tx_n: u32,
}

async fn get_statechain_info(pool: &sqlx::PgPool, statechain_id: &str) -> Vec::<StatechainInfo> {

    let mut result = Vec::<StatechainInfo>::new();

    let query = "\
        SELECT statechain_id, r2_commitment, blind_commitment, server_pubnonce, challenge, tx_n \
        FROM statechain_signature_data \
        WHERE statechain_id = $1 \
        ORDER BY created_at ASC";

    let rows = sqlx::query(query)
        .bind(statechain_id)
        .fetch_all(pool)
        .await
        .unwrap();

    for row in rows {
        let statechain_id: String = row.get(0);
        let r2_commitment: String = row.get(1);
        let blind_commitment: String = row.get(2);
        let server_pubnonce: String = row.get(3);
        let challenge: String = row.get(4);
        let tx_n: i32 = row.get(5);

        let statechain_transfer = StatechainInfo {
            statechain_id,
            r2_commitment,
            blind_commitment,
            server_pubnonce,
            challenge,
            tx_n: tx_n as u32,
        };

        result.push(statechain_transfer);
    }

    result.sort_by(|a, b| a.tx_n.cmp(&b.tx_n));

    result
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

    let response: Value = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));
    let num_sigs = response["sig_count"].as_u64().unwrap();

    let statechain_info = get_statechain_info(&statechain_entity.pool, &statechain_id).await;

    let response_body = json!({
        "num_sigs": num_sigs,
        "statechain_info": statechain_info
    });

    return status::Custom(Status::Ok, Json(response_body));
    
}

async fn get_statechain_transfer_messages(pool: &sqlx::PgPool, new_user_auth_key: &PublicKey) -> Vec::<String> {

    let query = "\
        SELECT encrypted_transfer_msg \
        FROM statechain_transfer \
        WHERE new_user_auth_public_key = $1
        AND encrypted_transfer_msg IS NOT NULL \
        ORDER BY updated_at ASC";

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
    
    let result = get_statechain_transfer_messages(&statechain_entity.pool, &new_user_auth_public_key).await;

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

async fn get_auth_pubkey_and_x1(pool: &sqlx::PgPool, statechain_id: &str) -> Option<(PublicKey, Vec<u8>)> {

    let query = "\
        SELECT new_user_auth_public_key, x1 \
        FROM statechain_transfer \
        WHERE statechain_id = $1";

    let row = sqlx::query(query)
        .bind(statechain_id)
        .fetch_one(pool)
        .await
        .unwrap();

    if row.is_empty() {
        return None;
    }

    let new_user_auth_public_key_bytes = row.get::<Vec<u8>, _>(0);
    let new_user_auth_public_key = PublicKey::from_slice(&new_user_auth_public_key_bytes).unwrap();

    let x1_bytes = row.get::<Vec<u8>, _>(1);

    Some((new_user_auth_public_key, x1_bytes))
}

type TransferReceiverRequestPayload = mercury_lib::transfer::receiver::TransferReceiverRequestPayload;

#[post("/transfer/receiver", format = "json", data = "<transfer_receiver_request_payload>")]
pub async fn transfer_receiver(statechain_entity: &State<StateChainEntity>, transfer_receiver_request_payload: Json<TransferReceiverRequestPayload>) -> status::Custom<Json<Value>> {

    let auth_pubkey_x1 = get_auth_pubkey_and_x1(&statechain_entity.pool, &transfer_receiver_request_payload.statechain_id).await;

    if auth_pubkey_x1.is_none() {
        let response_body = json!({
            "error": "Not Found",
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
            "error": "Internal Server Error",
            "message": "Signature does not match authentication key."
        });
    
        return status::Custom(Status::InternalServerError, Json(response_body));

    }

    let x1_hex = hex::encode(x1);

    let key_update_response_payload = mercury_lib::transfer::receiver::KeyUpdateResponsePayload { 
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

    #[derive(Serialize, Deserialize)]
    pub struct TransferReceiverResponsePayload<'r> {
        server_pubkey: &'r str,
    }

    let response: TransferReceiverResponsePayload = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));

    let mut server_pubkey_hex = response.server_pubkey.to_string();

    if server_pubkey_hex.starts_with("0x") {
        server_pubkey_hex = server_pubkey_hex[2..].to_string();
    }

    let server_pubkey = PublicKey::from_str(&server_pubkey_hex).unwrap();

    update_statechain(&statechain_entity.pool, &auth_pubkey, &server_pubkey, &statechain_id).await;

    let response_body = json!({
        "server_pubkey": server_pubkey.to_string(),
    });

    status::Custom(Status::Ok, Json(response_body))
}

pub async fn update_statechain(pool: &sqlx::PgPool, auth_key: &XOnlyPublicKey, server_public_key: &PublicKey, statechain_id: &str)  {

    let query = "UPDATE statechain_data \
        SET auth_xonly_public_key = $1, server_public_key = $2 \
        WHERE statechain_id = $3";

    let _ = sqlx::query(query)
        .bind(&auth_key.serialize())
        .bind(&server_public_key.serialize())
        .bind(statechain_id)
        .execute(pool)
        .await
        .unwrap();
}