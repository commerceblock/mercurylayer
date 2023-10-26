use crate::wallet::Coin;
use anyhow::Result;
use bitcoin::{hashes::sha256, PrivateKey, secp256k1};
use secp256k1_zkp::{Message, Secp256k1};
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct DepositMsg1 {
    pub amount: u32,
    pub auth_key: String,
    pub token_id: String,
    pub signed_token_id: String,
}

pub fn create_deposit_msg1(coin: &Coin, token_id: &str, amount: u32) -> Result<DepositMsg1>{
    let msg = Message::from_hashed_data::<sha256::Hash>(token_id.to_string().as_bytes());

    let secp = Secp256k1::new();
    let auth_secret_key = PrivateKey::from_wif(&coin.auth_privkey)?.inner;
    let keypair = secp256k1::KeyPair::from_seckey_slice(&secp, auth_secret_key.as_ref())?;
    let signed_token_id = secp.sign_schnorr(&msg, &keypair);

    let deposit_msg_1 = DepositMsg1 {
        amount: amount as u32,
        auth_key: coin.auth_pubkey.clone(),
        token_id: token_id.to_string(),
        signed_token_id: signed_token_id.to_string(),
    };

    Ok(deposit_msg_1)
}
