use std::str::FromStr;

use bitcoin::hashes::sha256;
use rocket::{State, serde::json::Json, response::status, http::Status};
use secp256k1_zkp::{XOnlyPublicKey, Secp256k1, Message, schnorr::Signature};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::Row;

use crate::server::StateChainEntity;

#[derive(Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct SignFirstRequestPayload {
    statechain_id: String,
    r2_commitment: String,
    blind_commitment: String,
    signed_statechain_id: String,
}

pub async fn update_commitments(pool: &sqlx::PgPool, r2_commitment: &str, blind_commitment: &str, statechain_id: &str)  {

    let query = "\
        UPDATE statechain_data \
        SET r2_commitment= $1, blind_commitment = $2 \
        WHERE statechain_id = $3";

    let _ = sqlx::query(query)
        .bind(r2_commitment)
        .bind(blind_commitment)
        .bind(statechain_id)
        .execute(pool)
        .await
        .unwrap();
}

pub async fn insert_new_signature_data(pool: &sqlx::PgPool, r2_commitment: &str, blind_commitment: &str, server_pubnonce: &str, statechain_id: &str)  {

    let row = sqlx::query("SELECT COALESCE(MAX(tx_n), 0) FROM public.statechain_signature_data WHERE statechain_id = $1")
        .bind(statechain_id)
        .fetch_one(pool)
        .await
        .unwrap();

    let mut new_tx_n = row.get::<i32, _>(0);
    new_tx_n = new_tx_n + 1;

    let query = "\
        INSERT INTO statechain_signature_data \
        (blind_commitment, r2_commitment, server_pubnonce, statechain_id, tx_n) \
        VALUES ($1, $2, $3, $4, $5)";

    let _ = sqlx::query(query)
        .bind(blind_commitment)
        .bind(r2_commitment)
        .bind(server_pubnonce)
        .bind(statechain_id)
        .bind(new_tx_n)
        .execute(pool)
        .await
        .unwrap();
}

#[post("/sign/first", format = "json", data = "<sign_first_request_payload>")]
pub async fn sign_first(statechain_entity: &State<StateChainEntity>, sign_first_request_payload: Json<SignFirstRequestPayload>) -> status::Custom<Json<Value>>  {

    let statechain_entity = statechain_entity.inner();

    let lockbox_endpoint = statechain_entity.config.lockbox.clone().unwrap();
    let path = "get_public_nonce";

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.post(&format!("{}/{}", lockbox_endpoint, path));

    let statechain_id = sign_first_request_payload.0.statechain_id.clone();
    let r2_commitment = sign_first_request_payload.0.r2_commitment.clone();
    let blind_commitment = sign_first_request_payload.0.blind_commitment.clone();
    let signed_statechain_id = sign_first_request_payload.0.signed_statechain_id.clone();

    if !crate::endpoints::utils::validate_signature(&statechain_entity.pool, &signed_statechain_id, &statechain_id).await {

        let response_body = json!({
            "error": "Internal Server Error",
            "message": "Signature does not match authentication key."
        });
    
        return status::Custom(Status::InternalServerError, Json(response_body));
    }

    update_commitments(&statechain_entity.pool, &r2_commitment, &blind_commitment, &statechain_id).await;

    let value = match request.json(&sign_first_request_payload.0).send().await {
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

    println!("value: {}", value);

    #[derive(Serialize, Deserialize, Debug, Clone)]
    pub struct ServerPublicNonceResponsePayload {
        server_pubnonce: String,
    }

    let response: ServerPublicNonceResponsePayload = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));

    insert_new_signature_data(&statechain_entity.pool, &r2_commitment, &blind_commitment, &response.server_pubnonce, &statechain_id,).await;

    let response_body = json!(response);

/*     let response_body = json!({
        "server_pubnonce": hex::encode(server_pub_nonce.serialize()),
    }); */

    return status::Custom(Status::Ok, Json(response_body));
}

#[derive(Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct PartialSignatureRequestPayload<'r> {
    statechain_id: &'r str,
    keyaggcoef: &'r str,
    negate_seckey: u8,
    session: &'r str,
    signed_statechain_id: String,
}

#[post("/sign/second", format = "json", data = "<partial_signature_request_payload>")]
pub async fn sign_second (statechain_entity: &State<StateChainEntity>, partial_signature_request_payload: Json<PartialSignatureRequestPayload<'_>>) -> status::Custom<Json<Value>>  {
    
    let statechain_entity = statechain_entity.inner();

    let lockbox_endpoint = statechain_entity.config.lockbox.clone().unwrap();
    let path = "get_partial_signature";

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.post(&format!("{}/{}", lockbox_endpoint, path));

    let statechain_id = partial_signature_request_payload.0.statechain_id.clone();
    let signed_statechain_id = partial_signature_request_payload.0.signed_statechain_id.clone();

    if !crate::endpoints::utils::validate_signature(&statechain_entity.pool, &signed_statechain_id, &statechain_id).await {

        let response_body = json!({
            "error": "Internal Server Error",
            "message": "Signature does not match authentication key."
        });
    
        return status::Custom(Status::InternalServerError, Json(response_body));
    }

    let value = match request.json(&partial_signature_request_payload.0).send().await {
        Ok(response) => {
            let text = response.text().await.unwrap();
            text
        },
        Err(err) => {
            println!("ERROR sig: {}", err);

            let response_body = json!({
                "error": "Internal Server Error",
                "message": err.to_string()
            });
        
            return status::Custom(Status::InternalServerError, Json(response_body));
        },
    };

    #[derive(Serialize, Deserialize, Debug, Clone)]
    pub struct PartialSignatureResponsePayload<'r> {
        partial_sig: &'r str,
    }

    let response: PartialSignatureResponsePayload = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));

    let response_body = json!(response);

    return status::Custom(Status::Ok, Json(response_body));
}
   