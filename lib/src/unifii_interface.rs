// the functions in this file are called by the unifii library
// They were created because we would need to expose to the unifii library some low level functions and struct that are not part of the wallet API
// TODO: 1. verify if they can also be used with WASM, unifyify both interface
//       2. use these same function in Rust client

use crate::{wallet::{Coin, Wallet}, MercuryError};

#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn get_new_coin(wallet: &Wallet) -> Result<Coin, MercuryError> {
    wallet.get_new_coin()
}

// #[cfg_attr(feature = "bindings", uniffi::export)]
// pub fn create_deposit_msg1(coin: &Coin, token: &Token) -> Result<DepositMsg1, MercuryError> {
//     deposit::create_deposit_msg1(&coin, &token.token_id)
// }