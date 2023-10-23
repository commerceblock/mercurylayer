use bip39::{Mnemonic, Language};

use crate::client_config::ClientConfig;

pub fn create_wallet(name: &str, client_config: &ClientConfig) {
    println!("Creating wallet {} on {} ...", name, client_config.network.to_string());

    let mut seed = [0u8; 16];  // 128 bits
    rand::RngCore::fill_bytes(&mut rand::thread_rng(), &mut seed);

    let mnemonic = Mnemonic::from_entropy_in(Language::English,&seed).unwrap();

    println!("mnemonic: {}", mnemonic.to_string());
}