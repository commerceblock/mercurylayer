use std::str::FromStr;

use crate::{error::MercuryError, utils::get_network, wallet::coin::Coin};
use bitcoin::{hashes::sha256, PrivateKey, secp256k1, Address};
use secp256k1_zkp::{Message, Secp256k1, PublicKey};
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenID {
    pub token_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
pub struct DepositMsg1 {
    pub auth_key: String,
    pub token_id: String,
    pub signed_token_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
pub struct DepositMsg1Response {
    pub server_pubkey: String,
    pub statechain_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
pub struct DepositInitResult {
    pub server_pubkey: String,
    pub statechain_id: String,
    pub signed_statechain_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
pub struct AggregatedPublicKey {
    pub aggregate_pubkey: String,
    pub aggregate_address: String,
}

#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn create_deposit_msg1(coin: &Coin, token_id: &str) -> Result<DepositMsg1, MercuryError>{
    let msg = Message::from_hashed_data::<sha256::Hash>(token_id.to_string().as_bytes());

    let secp = Secp256k1::new();
    let auth_secret_key = PrivateKey::from_wif(&coin.auth_privkey())?.inner;
    let keypair = secp256k1::KeyPair::from_seckey_slice(&secp, auth_secret_key.as_ref())?;
    let signed_token_id = secp.sign_schnorr(&msg, &keypair);

    let auth_xonly_pubkey = PublicKey::from_str(&coin.auth_pubkey())?.x_only_public_key().0;

    let deposit_msg_1 = DepositMsg1 {
        auth_key: auth_xonly_pubkey.to_string(),
        token_id: token_id.to_string(),
        signed_token_id: signed_token_id.to_string(),
    };

    Ok(deposit_msg_1)
}

#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn handle_deposit_msg_1_response(coin: &Coin, deposit_msg_1_response: &DepositMsg1Response) -> Result<DepositInitResult, MercuryError> {

    let secp = Secp256k1::new();

    let server_pubkey_share = PublicKey::from_str(&deposit_msg_1_response.server_pubkey).unwrap();

    let statechain_id = deposit_msg_1_response.statechain_id.to_string();

    let auth_secret_key = PrivateKey::from_wif(&coin.auth_privkey())?.inner;
    let keypair = secp256k1::KeyPair::from_seckey_slice(&secp, auth_secret_key.as_ref()).unwrap();

    let msg = Message::from_hashed_data::<sha256::Hash>(statechain_id.to_string().as_bytes());
    let signed_statechain_id = secp.sign_schnorr(&msg, &keypair);

    Ok(DepositInitResult {
        server_pubkey: server_pubkey_share.to_string(),
        statechain_id,
        signed_statechain_id: signed_statechain_id.to_string(),
    })
}

#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn create_aggregated_address(coin: &Coin, network: String) -> Result<AggregatedPublicKey, MercuryError> {

    let network = get_network(&network)?;

    let secp = Secp256k1::new();

    let user_pubkey_share = PublicKey::from_str(&coin.user_pubkey())?;
    let server_pubkey_share = PublicKey::from_str(&coin.server_pubkey().as_ref().unwrap())?;

    let aggregate_pubkey = user_pubkey_share.combine(&server_pubkey_share)?;

    let aggregated_xonly_pubkey = aggregate_pubkey.x_only_public_key().0; 

    let aggregate_address = Address::p2tr(&secp, aggregated_xonly_pubkey, None, network);

    Ok(AggregatedPublicKey {
        aggregate_pubkey: aggregate_pubkey.to_string(),
        aggregate_address: aggregate_address.to_string(),
    })

}