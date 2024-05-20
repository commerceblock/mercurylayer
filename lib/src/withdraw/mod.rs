use serde::{Serialize, Deserialize};

#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WithdrawCompletePayload {
    pub statechain_id: String,
    pub signed_statechain_id: String,
}