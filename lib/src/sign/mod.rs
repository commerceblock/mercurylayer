use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PartialSignatureRequestPayload<'r> {
    pub statechain_id: &'r str,
    pub negate_seckey: u8,
    pub session: &'r str,
    pub signed_statechain_id: &'r str,
    pub server_pub_nonce: &'r str,
}