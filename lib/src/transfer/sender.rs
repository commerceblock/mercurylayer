use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct TransferSenderRequestPayload {
    pub statechain_id: String,
    pub auth_sig: String, // signed_statechain_id
    pub new_user_auth_key: String,
    pub batch_id: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct TransferSenderResponsePayload {
    pub x1: String,
}