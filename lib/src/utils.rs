use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct ServerConfig {
    pub initlock: u32,
    pub interval: u32,
}

