// the functions in this file are called by the unifii library
// They were created because we would need to expose to the unifii library some low level functions and struct that are not part of the wallet API
// TODO: 1. verify if they can also be used with WASM, unifyify both interface
//       2. use these same function in Rust client

use serde::{Deserialize, Serialize};

use crate::{decode_transfer_address, wallet::{Coin, Wallet}, MercuryError};

#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn get_new_coin(wallet: &Wallet) -> Result<Coin, MercuryError> {
    wallet.get_new_coin()
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
pub struct DecodedSCAddress {
    version: u8,
    user_pubkey: String,
    auth_pubkey: String,
}

#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn decode_statechain_address(sc_address: String) -> Result<DecodedSCAddress, MercuryError> {
    
    let (version, user_pubkey, auth_pubkey) = decode_transfer_address(&sc_address)?;

    Ok(DecodedSCAddress {
        version,
        user_pubkey: user_pubkey.to_string(),
        auth_pubkey: auth_pubkey.to_string(),
    })
}