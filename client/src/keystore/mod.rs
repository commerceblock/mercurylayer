pub mod key_path;
pub mod key_path_with_addresses;

use bitcoin::{PrivateKey, PublicKey};

#[derive(Debug, Copy, Clone)]
pub struct KeyDerivation {
    pub pos: u32,
    pub private_key: PrivateKey,
    pub public_key: Option<PublicKey>,
}
impl KeyDerivation {
    pub fn new(pos: u32, private_key: PrivateKey, public_key: Option<PublicKey>) -> Self {
        KeyDerivation {
            pos,
            private_key,
            public_key,
        }
    }
}