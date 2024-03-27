use std::str::FromStr;

use bitcoin::hashes::sha256;
use rocket::{serde::json::Json, response::status, State, http::Status};
use secp256k1_zkp::{XOnlyPublicKey, schnorr::Signature, Message, Secp256k1, PublicKey};
use serde::{Serialize, Deserialize};
use serde_json::{Value, json};
use sqlx::Row;

use crate::server::StateChainEntity;


pub async fn get_token_status(pool: &sqlx::PgPool, token_id: &str) -> Option<bool> {

    let row = sqlx::query(
        "SELECT confirmed, spent \
        FROM public.tokens \
        WHERE token_id = $1")
        .bind(&token_id)
        .fetch_one(pool)
        .await;

    if row.is_err() {
        match row.err().unwrap() {
            sqlx::Error::RowNotFound => return None,
            _ => return None, // this case should be treated as unexpected error
        }
    }

    let row = row.unwrap();

    let confirmed: bool = row.get(0);
    let spent: bool = row.get(1);
    if confirmed && !spent {
        return Some(true);
    } else {
        return Some(false);
    }

}

pub async fn set_token_spent(pool: &sqlx::PgPool, token_id: &str)  {

    let mut transaction = pool.begin().await.unwrap();

    let query = "UPDATE tokens \
        SET spent = true \
        WHERE token_id = $1";

    let _ = sqlx::query(query)
        .bind(token_id)
        .execute(&mut *transaction)
        .await
        .unwrap();

    transaction.commit().await.unwrap();
}

pub async fn check_existing_key(pool: &sqlx::PgPool, auth_key: &XOnlyPublicKey) -> Option<mercury_lib::deposit::DepositMsg1Response> {

    let row = sqlx::query(
        "SELECT statechain_id, server_public_key \
        FROM statechain_data \
        WHERE auth_xonly_public_key = $1")
        .bind(&auth_key.serialize())
        .fetch_one(pool)
        .await;

    if row.is_err() {
        match row.err().unwrap() {
            sqlx::Error::RowNotFound => return None,
            _ => return None
        }
    }

    let row_ur = row.unwrap();

    let server_public_key_bytes = row_ur.get::<Vec<u8>, _>(1);
    let server_pubkey = PublicKey::from_slice(&server_public_key_bytes).unwrap();

    let deposit_msg1_response = mercury_lib::deposit::DepositMsg1Response {
        server_pubkey: server_pubkey.to_string(),
        statechain_id: row_ur.get(0),
    };

    return Some(deposit_msg1_response);

}

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

    insert_new_token(&statechain_entity.pool, &token_id).await;

    let token = mercury_lib::deposit::TokenID {
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

    let token_id = uuid::Uuid::new_v4().to_string();
    let processor_id = uuid::Uuid::new_v4().to_string();
    let lightning_invoice =  String::from("lnbc10u1pj3knpdsp5k9f25s2wpzewkf9c78pftkgnkuuz82erkcjml7zkgsp7znyhs5yspp5rxz3tkc7ydgln3u7ez6duhp0g6jpzgtnn7ph5xrjy6muh9xm07wqdp2f9h8vmmfvdjjqen0wgsy6ctfdeehgcteyp6x76m9dcxqyjw5qcqpj9qyysgq6z9whs8am75r6mzcgt76vlwgk5g9yq5g8xefdxx6few6d5why7fs7h5g2dx9hk7s60ywtnkyc0f3p0cha4a9kmgkq5jvu5e7hvsaawqpjtf8p4");
    let confirmed = false;
    let spent = false;

    insert_new_token(&statechain_entity.pool, &token_id).await;

    let token = mercury_lib::wallet::Token {
        token_id,
        lightning_invoice,
        processor_id,
        confirmed,
        spent,
    };

    let response_body = json!(token);

    return status::Custom(Status::Ok, Json(response_body));
}

#[post("/deposit/init/pod", format = "json", data = "<deposit_msg1>")]
pub async fn post_deposit(statechain_entity: &State<StateChainEntity>, deposit_msg1: Json<mercury_lib::deposit::DepositMsg1>) -> status::Custom<Json<Value>> {

    let statechain_entity = statechain_entity.inner();

    let auth_key = XOnlyPublicKey::from_str(&deposit_msg1.auth_key).unwrap();
    let token_id = deposit_msg1.token_id.clone();
    let signed_token_id = Signature::from_str(&deposit_msg1.signed_token_id.to_string()).unwrap();

    let msg = Message::from_hashed_data::<sha256::Hash>(token_id.to_string().as_bytes());

    let secp = Secp256k1::new();
    if !secp.verify_schnorr(&signed_token_id, &msg, &auth_key).is_ok() {

        let response_body = json!({
            "error": "Internal Server Error",
            "message": "Signature does not match authentication key."
        });
    
        return status::Custom(Status::InternalServerError, Json(response_body));

    }

    let existing_key = check_existing_key(&statechain_entity.pool, &auth_key).await;

    if !existing_key.is_none() {
        let response_body = json!(existing_key.unwrap());
    
        return status::Custom(Status::Ok, Json(response_body));
    }

    let valid_token =  get_token_status(&statechain_entity.pool, &token_id).await;

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

    insert_new_deposit(&statechain_entity.pool, &token_id, &auth_key, &server_pubkey, &statechain_id).await;

    set_token_spent(&statechain_entity.pool, &token_id).await;

    let deposit_msg1_response = mercury_lib::deposit::DepositMsg1Response {
        server_pubkey: server_pubkey.to_string(),
        statechain_id,
    };

    let response_body = json!(deposit_msg1_response);

    status::Custom(Status::Ok, Json(response_body))
}

pub async fn insert_new_deposit(pool: &sqlx::PgPool, token_id: &str, auth_key: &XOnlyPublicKey, server_public_key: &PublicKey, statechain_id: &String)  {

    let query = "INSERT INTO statechain_data (token_id, auth_xonly_public_key, server_public_key, statechain_id) VALUES ($1, $2, $3, $4)";

    let _ = sqlx::query(query)
        .bind(token_id)
        .bind(&auth_key.serialize())
        .bind(&server_public_key.serialize())
        .bind(statechain_id)
        .execute(pool)
        .await
        .unwrap();
}

pub async fn insert_new_token(pool: &sqlx::PgPool, token_id: &str)  {

    let query = "INSERT INTO tokens (token_id, confirmed, spent) VALUES ($1, $2, $3)";

    let _ = sqlx::query(query)
        .bind(token_id)
        .bind(true)
        .bind(false)
        .execute(pool)
        .await
        .unwrap();
}
