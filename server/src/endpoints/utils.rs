use rocket::{State, response::status, http::Status, serde::json::Json};
use serde_json::{json, Value};

use crate::server::StateChainEntity;

#[get("/info/config", format = "json")]
pub async fn info_config(statechain_entity: &State<StateChainEntity>) -> status::Custom<Json<Value>> {
    let statechain_entity = statechain_entity.inner();

    let response_body = json!({
        "interval": statechain_entity.config.lh_decrement,
        "initlock": statechain_entity.config.lockheight_init,
    });

    return status::Custom(Status::Ok, Json(response_body));
}