use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct DeleteStatechainPayload {
    pub statechain_id: String,
    pub signed_statechain_id: String,
}