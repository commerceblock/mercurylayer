use std::str::FromStr;

use bitcoin::PublicKey;
use rocket::{State, response::status, serde::json::Json, http::Status};
use serde::{Serialize, Deserialize};
use serde_json::{Value, json};

use crate::server::StateChainEntity;

#[get("/transfer/get_msg_addr/<new_auth_key>")]
pub async fn transfer_update_msg(statechain_entity: &State<StateChainEntity>, new_auth_key: &str) -> status::Custom<Json<Value>>  {

    let new_user_auth_public_key = PublicKey::from_str(new_auth_key);

    if new_user_auth_public_key.is_err() {
        let response_body = json!({
            "error": "Internal Server Error",
            "message": "Invalid authentication public key"
        });
    
        return status::Custom(Status::InternalServerError, Json(response_body));
    }

    let new_user_auth_public_key = new_user_auth_public_key.unwrap();

    let response_body = json!({
        "error": "Internal Server Error",
        "message": "Signature does not match authentication key."
    });

    return status::Custom(Status::InternalServerError, Json(response_body));
}