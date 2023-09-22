use std::str::FromStr;

use bitcoin::hashes::sha256;
use rocket::{serde::json::Json, response::status, State, http::Status};
use secp256k1_zkp::{XOnlyPublicKey, schnorr::Signature, Message, Secp256k1, PublicKey};
use serde::{Serialize, Deserialize};
use serde_json::{Value, json};

use crate::server::StateChainEntity;

#[derive(Debug, Serialize, Deserialize)]
pub struct DepositRequestPayload {
    amount: u64,
    auth_key: String,
    token_id: String,
    signed_token_id: String,
}

#[post("/deposit/init/pod", format = "json", data = "<deposit_request_payload>")]
pub async fn post_deposit(statechain_entity: &State<StateChainEntity>, deposit_request_payload: Json<DepositRequestPayload>) -> status::Custom<Json<Value>> {

    let statechain_entity = statechain_entity.inner();

    let auth_key = XOnlyPublicKey::from_str(&deposit_request_payload.auth_key).unwrap();
    let amount = deposit_request_payload.amount;
    let token_id = deposit_request_payload.token_id.clone();
    let signed_token_id = Signature::from_str(&deposit_request_payload.signed_token_id.to_string()).unwrap();

    let msg = Message::from_hashed_data::<sha256::Hash>(token_id.to_string().as_bytes());

    let secp = Secp256k1::new();
    if !secp.verify_schnorr(&signed_token_id, &msg, &auth_key).is_ok() {

        let response_body = json!({
            "error": "Internal Server Error",
            "message": "Signature does not match authentication key."
        });
    
        return status::Custom(Status::InternalServerError, Json(response_body));

    }

    let statechain_id = uuid::Uuid::new_v4().as_simple().to_string(); 

    #[derive(Debug, Serialize, Deserialize)]
    pub struct GetPublicKeyRequestPayload {
        statechain_id: String,
    }

    let lockbox_endpoint = "http://0.0.0.0:18080";
    let path = "get_public_key";

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.post(&format!("{}/{}", lockbox_endpoint, path));

    let payload = GetPublicKeyRequestPayload {
        statechain_id: statechain_id.clone(),
    };

    let value = match request.json(&payload).send().await {
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
    pub struct PublicNonceRequestPayload<'r> {
        server_pubkey: &'r str,
    }

    let response: PublicNonceRequestPayload = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));

    let mut server_pubkey_hex = response.server_pubkey.to_string();

    if server_pubkey_hex.starts_with("0x") {
        server_pubkey_hex = server_pubkey_hex[2..].to_string();
    }

    let server_pubkey = PublicKey::from_str(&server_pubkey_hex).unwrap();

    insert_new_deposit(&statechain_entity.pool, &token_id, &auth_key, &server_pubkey, amount, &statechain_id).await;

    let response_body = json!({
        "server_pubkey": server_pubkey.to_string(),
        "statechain_id": statechain_id,
    });

    status::Custom(Status::Ok, Json(response_body))
}

pub async fn insert_new_deposit(pool: &sqlx::PgPool, token_id: &str, auth_key: &XOnlyPublicKey, server_public_key: &PublicKey, amount: u64, statechain_id: &String)  {

    let query = "INSERT INTO key_data (token_id, auth_xonly_public_key, server_public_key, amount, statechain_id) VALUES ($1, $2, $3, $4, $5)";

    let _ = sqlx::query(query)
        .bind(token_id)
        .bind(&auth_key.serialize())
        .bind(&server_public_key.serialize())
        .bind(amount as i64)
        .bind(statechain_id)
        .execute(pool)
        .await
        .unwrap();
}
