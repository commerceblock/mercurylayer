use chrono::{DateTime, Duration, Utc};
use rocket::State;

use crate::server::StateChainEntity;

pub mod deposit;
pub mod sign;
pub mod utils;
pub mod transfer_sender;
pub mod transfer_receiver;
pub mod withdraw;


fn is_batch_expired(statechain_entity: &State<StateChainEntity>, batch_time: DateTime<Utc>) -> bool {
    let batch_timeout = statechain_entity.config.batch_timeout;

    let expiration_time = batch_time + Duration::seconds(batch_timeout as i64);

    let now = chrono::Utc::now();

    return now > expiration_time
}