use std::str::FromStr;

use bitcoin::hashes::sha256;
use mercurylib::transfer::receiver::{GetMsgAddrResponsePayload, StatechainInfo, TransferReceiverGetResponsePayload, TransferReceiverPostResponsePayload};
use rocket::{State, response::status, serde::json::Json, http::Status};
use secp256k1_zkp::{PublicKey, schnorr::Signature, Message, Secp256k1, XOnlyPublicKey, SecretKey};
use serde_json::{Value, json};
use sqlx::Row;

use crate::server::StateChainEntity;

async fn get_statechain_info(pool: &sqlx::PgPool, statechain_id: &str) -> Vec::<StatechainInfo> {

    let mut result = Vec::<StatechainInfo>::new();

    let query = "\
        SELECT statechain_id, server_pubnonce, challenge, tx_n \
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
        let server_pubnonce: String = row.get(1);
        let challenge: String = row.get(2);
        let tx_n: i32 = row.get(3);

        let statechain_transfer = StatechainInfo {
            statechain_id,
            server_pubnonce,
            challenge,
            tx_n: tx_n as u32,
        };

        result.push(statechain_transfer);
    }

    result.sort_by(|a, b| a.tx_n.cmp(&b.tx_n));

    result
}

async fn get_enclave_pubkey_and_x1pub(pool: &sqlx::PgPool, statechain_id: &str) -> (PublicKey, PublicKey) {

    let query = "\
        SELECT std.server_public_key, stt.x1 \
        FROM statechain_data std INNER JOIN statechain_transfer stt \
        ON std.statechain_id = stt.statechain_id \
        WHERE std.statechain_id = $1";

    let row = sqlx::query(query)
        .bind(statechain_id)
        .fetch_one(pool)
        .await
        .unwrap();

    let enclave_public_key_bytes = row.get::<Vec<u8>, _>("server_public_key");
    let enclave_public_key = PublicKey::from_slice(&enclave_public_key_bytes).unwrap();

    let x1_secret_bytes = row.get::<Vec<u8>, _>("x1");
    let secret_x1 = SecretKey::from_slice(&x1_secret_bytes).unwrap();

    (enclave_public_key, secret_x1.public_key(&Secp256k1::new()))
}

#[get("/info/statechain/<statechain_id>")]
pub async fn statechain_info(statechain_entity: &State<StateChainEntity>, statechain_id: &str) -> status::Custom<Json<Value>> {

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
    let (enclave_public_key, x1_pub) = get_enclave_pubkey_and_x1pub(&statechain_entity.pool, &statechain_id).await;

    let response_body = json!({
        "enclave_public_key": enclave_public_key.to_string(),
        "num_sigs": num_sigs,
        "statechain_info": statechain_info,
        "x1_pub": x1_pub.to_string(),
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

    let get_msg_addr_response_payload = GetMsgAddrResponsePayload {
        list_enc_transfer_msg:result
    };

    let response_body = json!(get_msg_addr_response_payload);

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

type TransferReceiverRequestPayload = mercurylib::transfer::receiver::TransferReceiverRequestPayload;

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

    if is_key_already_updated(&statechain_entity.pool, &statechain_id).await {

        let server_public_key = get_server_public_key(&statechain_entity.pool, &statechain_id).await;

        if server_public_key.is_none() {
            let response_body = json!({
                "error": "Internal Server Error",
                "message": "Server public key not found."
            });
        
            return status::Custom(Status::InternalServerError, Json(response_body));
        }

        let server_public_key = server_public_key.unwrap();

        let response_body = json!({
            "server_pubkey": server_public_key.to_string(),
        });

        return status::Custom(Status::Ok, Json(response_body));
    }

    let x1_hex = hex::encode(x1);

    let key_update_response_payload = mercurylib::transfer::receiver::KeyUpdateResponsePayload { 
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

    let response: TransferReceiverPostResponsePayload = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));

    let mut server_pubkey_hex = response.server_pubkey.clone();

    if server_pubkey_hex.starts_with("0x") {
        server_pubkey_hex = server_pubkey_hex[2..].to_string();
    }

    let server_pubkey = PublicKey::from_str(&server_pubkey_hex).unwrap();

    update_statechain(&statechain_entity.pool, &auth_pubkey, &server_pubkey, &statechain_id).await;

    let response_body = json!(TransferReceiverPostResponsePayload {
        server_pubkey: server_pubkey.to_string(),
    });

    status::Custom(Status::Ok, Json(response_body))
}

#[get("/transfer/receiver/<statechain_id>")]
pub async fn get_transfer_receive(statechain_entity: &State<StateChainEntity>, statechain_id: String) -> status::Custom<Json<Value>> {

    let transfer_complete = is_key_already_updated(&statechain_entity.pool, &statechain_id).await;

    let response_body = json!(TransferReceiverGetResponsePayload {
        transfer_complete: transfer_complete,
    });

    status::Custom(Status::Ok, Json(response_body))
}

pub async fn is_key_already_updated(pool: &sqlx::PgPool, statechain_id: &str) -> bool {

    let query = "\
        SELECT key_updated \
        FROM statechain_transfer \
        WHERE statechain_id = $1";

    let row = sqlx::query(query)
        .bind(statechain_id)
        .fetch_one(pool)
        .await
        .unwrap();

    let key_updated: bool = row.get(0);

    key_updated
}

pub async fn get_server_public_key(pool: &sqlx::PgPool, statechain_id: &str) -> Option<PublicKey> {

    let query = "\
        SELECT server_public_key \
        FROM statechain_data \
        WHERE statechain_id = $1";

    let row = sqlx::query(query)
        .bind(statechain_id)
        .fetch_one(pool)
        .await
        .unwrap();

    let server_public_key_bytes: Vec<u8> = row.get(0);

    if server_public_key_bytes.len() == 0 {
        return None;
    }

    let server_public_key = PublicKey::from_slice(&server_public_key_bytes).unwrap();

    Some(server_public_key)
}

pub async fn update_statechain(pool: &sqlx::PgPool, auth_key: &XOnlyPublicKey, server_public_key: &PublicKey, statechain_id: &str)  {

    let mut transaction = pool.begin().await.unwrap();

    let query = "UPDATE statechain_data \
        SET auth_xonly_public_key = $1, server_public_key = $2 \
        WHERE statechain_id = $3";

    let _ = sqlx::query(query)
        .bind(&auth_key.serialize())
        .bind(&server_public_key.serialize())
        .bind(statechain_id)
        .execute(&mut *transaction)
        .await
        .unwrap();

    let query = "UPDATE statechain_transfer \
        SET key_updated = true \
        WHERE statechain_id = $1";

    let _ = sqlx::query(query)
        .bind(statechain_id)
        .execute(&mut *transaction)
        .await
        .unwrap();

    transaction.commit().await.unwrap();
}
