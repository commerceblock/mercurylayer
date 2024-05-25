use std::str::FromStr;

use bitcoin::hashes::sha256;
use rocket::{serde::json::Json, response::status, State, http::Status};
use secp256k1_zkp::{XOnlyPublicKey, schnorr::Signature, Message, Secp256k1, PublicKey};
use serde::{Serialize, Deserialize};
use serde_json::{Value, json};
use crate::server::StateChainEntity;

#[get("/deposit/get_token")]
pub async fn get_token(statechain_entity: &State<StateChainEntity>) -> status::Custom<Json<Value>>  {

    if statechain_entity.config.network == "mainnet" {
        let response_body = json!({
            "error": "Internal Server Error",
            "message": "Token generation not supported on mainnet."
        });
    
        return status::Custom(Status::InternalServerError, Json(response_body));
    }

    let token_id = uuid::Uuid::new_v4().to_string();   

    crate::database::deposit::insert_new_token(&statechain_entity.pool, &token_id).await;

    let token = mercurylib::deposit::TokenID {
        token_id
    };

    let response_body = json!(token);

    return status::Custom(Status::Ok, Json(response_body));
}

#[get("/tokens/token_init")]
pub async fn token_init(statechain_entity: &State<StateChainEntity>) -> status::Custom<Json<Value>>  {

    if statechain_entity.config.network == "mainnet" {
        let response_body = json!({
            "error": "Internal Server Error",
            "message": "Token generation not supported on mainnet."
        });
    
        return status::Custom(Status::InternalServerError, Json(response_body));
    }

    let btc_payment_address = String::from("tb1qdgjdmmsdp5hkrhwl6cxd3uvt6hvjvlmmzucdca");
    let fee =  String::from("0.0001");
    let lightning_invoice =  String::from("lnbc10u1pj3knpdsp5k9f25s2wpzewkf9c78pftkgnkuuz82erkcjml7zkgsp7znyhs5yspp5rxz3tkc7ydgln3u7ez6duhp0g6jpzgtnn7ph5xrjy6muh9xm07wqdp2f9h8vmmfvdjjqen0wgsy6ctfdeehgcteyp6x76m9dcxqyjw5qcqpj9qyysgq6z9whs8am75r6mzcgt76vlwgk5g9yq5g8xefdxx6few6d5why7fs7h5g2dx9hk7s60ywtnkyc0f3p0cha4a9kmgkq5jvu5e7hvsaawqpjtf8p4");
    let processor_id = uuid::Uuid::new_v4().to_string();
    let token_id = uuid::Uuid::new_v4().to_string();
    let confirmed = false;
    let spent = false;
    let expiry = String::from("2024-12-26T17:29:50.013Z");

    crate::database::deposit::insert_new_token(&statechain_entity.pool, &token_id).await;

    let token = mercurylib::wallet::Token {
        btc_payment_address,
        fee,
        lightning_invoice,
        processor_id,
        token_id,
        confirmed,
        spent,
        expiry
    };

    let response_body = json!(token);

    return status::Custom(Status::Ok, Json(response_body));
}

#[post("/deposit/init/pod", format = "json", data = "<deposit_msg1>")]
pub async fn post_deposit(statechain_entity: &State<StateChainEntity>, deposit_msg1: Json<mercurylib::deposit::DepositMsg1>) -> status::Custom<Json<Value>> {

    let statechain_entity = statechain_entity.inner();

    let auth_key = XOnlyPublicKey::from_str(&deposit_msg1.auth_key).unwrap();
    let token_id = deposit_msg1.token_id.clone();
    let signed_token_id = Signature::from_str(&deposit_msg1.signed_token_id.to_string()).unwrap();

    let msg = Message::from_hashed_data::<sha256::Hash>(token_id.to_string().as_bytes());

    let secp = Secp256k1::new();
    if !secp.verify_schnorr(&signed_token_id, &msg, &auth_key).is_ok() {

        let response_body = json!({
            "message": "Signature does not match authentication key."
        });
    
        return status::Custom(Status::InternalServerError, Json(response_body));

    }

    let is_existing_key = crate::database::deposit::check_existing_key(&statechain_entity.pool, &auth_key).await;

    if is_existing_key {
        let response_body = json!({
            "message": "The authentication key is already assigned to a statecoin."
        });
    
        return status::Custom(Status::BadRequest, Json(response_body));
    }

    let valid_token =  crate::database::deposit::get_token_status(&statechain_entity.pool, &token_id).await;

    if valid_token.is_none() {
        let response_body = json!({
            "error": "Deposit Error",
            "message": "Token ID not found."
        });
    
        return status::Custom(Status::NotFound, Json(response_body));
    }

    if !valid_token.unwrap() {
        let response_body = json!({
            "error": "Deposit Error",
            "message": "Token unpaid or used."
        });
    
        return status::Custom(Status::Gone, Json(response_body));
    }

    let statechain_id = uuid::Uuid::new_v4().as_simple().to_string(); 

    #[derive(Debug, Serialize, Deserialize)]
    pub struct GetPublicKeyRequestPayload {
        statechain_id: String,
    }

    let lockbox_endpoint = statechain_entity.config.lockbox.clone().unwrap();
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

    crate::database::deposit::insert_new_deposit(&statechain_entity.pool, &token_id, &auth_key, &server_pubkey, &statechain_id).await;

    crate::database::deposit::set_token_spent(&statechain_entity.pool, &token_id).await;

    let deposit_msg1_response = mercurylib::deposit::DepositMsg1Response {
        server_pubkey: server_pubkey.to_string(),
        statechain_id,
    };

    let response_body = json!(deposit_msg1_response);

    status::Custom(Status::Ok, Json(response_body))
}
