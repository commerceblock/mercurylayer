use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct ServerConfig {
    pub initlock: u32,
    pub interval: u32,
}

pub struct InfoConfig {
    pub initlock: u32,
    pub interval: u32,
    pub fee_rate_sats_per_byte: u64,
}
