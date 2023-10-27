use rocket::{State, serde::json::Json, response::status, http::Status};
use secp256k1_zkp::musig::MusigSession;
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

pub async fn insert_new_signature_data(pool: &sqlx::PgPool, r2_commitment: &str, blind_commitment: &str, server_pubnonce: &str, statechain_id: &str)  {

    let mut transaction = pool.begin().await.unwrap();

    // FOR UPDATE is used to lock the row for the duration of the transaction
    // It is not allowed with aggregate functions (MAX in this case), so we need to wrap it in a subquery
    let max_tx_k_query = "\
        SELECT COALESCE(MAX(tx_n), 0) \
        FROM (\
            SELECT * \
            FROM statechain_signature_data \
            WHERE statechain_id = $1 FOR UPDATE) AS result";

    let row = sqlx::query(max_tx_k_query)
        .bind(statechain_id)
        .fetch_one(&mut *transaction)
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
        .execute(&mut *transaction)
        .await
        .unwrap();

    transaction.commit().await.unwrap();
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

    let response: mercury_lib::transaction::SignFirstResponsePayload = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));

    let mut server_pubnonce_hex = response.server_pubnonce.clone();

    if server_pubnonce_hex.starts_with("0x") {
        server_pubnonce_hex = server_pubnonce_hex[2..].to_string();
    }

    insert_new_signature_data(&statechain_entity.pool, &r2_commitment, &blind_commitment, &server_pubnonce_hex, &statechain_id,).await;

    let response_body = json!(response);

/*     let response_body = json!({
        "server_pubnonce": hex::encode(server_pub_nonce.serialize()),
    }); */

    return status::Custom(Status::Ok, Json(response_body));
}

pub async fn update_signature_data_challenge(pool: &sqlx::PgPool, server_pub_nonce: &str, challenge: &str, statechain_id: &str)  {

    println!("server_pub_nonce: {}", server_pub_nonce);
    println!("challenge: {}", challenge);
    println!("statechain_id: {}", statechain_id);

    let query = "\
        UPDATE statechain_signature_data \
        SET challenge = $1 \
        WHERE statechain_id = $2 AND server_pubnonce= $3";

    let _ = sqlx::query(query)
        .bind(challenge)
        .bind(statechain_id)
        .bind(server_pub_nonce)
        .execute(pool)
        .await
        .unwrap();
}

#[post("/sign/second", format = "json", data = "<partial_signature_request_payload>")]
pub async fn sign_second (statechain_entity: &State<StateChainEntity>, partial_signature_request_payload: Json<mercury_lib::sign::PartialSignatureRequestPayload<'_> >) -> status::Custom<Json<Value>>  {
    
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

    let session_bytes: [u8; 133] = hex::decode(partial_signature_request_payload.0.session).unwrap().try_into().unwrap();
    let session = MusigSession::from_slice(session_bytes);
    let challenge = session.get_challenge_from_session();
    let challenge_str = hex::encode(challenge);

    update_signature_data_challenge(&statechain_entity.pool, partial_signature_request_payload.0.server_pub_nonce, &challenge_str, statechain_id).await;

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
   