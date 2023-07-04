use rocket::{State, serde::json::Json};
use shared::structs::StateEntityFeeInfoAPI;

use crate::{server::StateChainEntity, error, protocol::util::Utilities};

/**
# Get statechain entity operating information
*/
#[get("/info/fee", format = "json")]
pub fn get_fees(sc_entity: &State<StateChainEntity>) -> Result<Json<StateEntityFeeInfoAPI>, error::SEError> {
    match sc_entity.get_fees() {
        Ok(res) => return Ok(Json(res)),
        Err(e) => return Err(e),
    }
}