use std::str::FromStr;

use bitcoin::{secp256k1, hashes::sha256, Txid, PrivateKey};
use secp256k1_zkp::{Secp256k1, Message, PublicKey};
use serde::{Serialize, Deserialize};
use anyhow::{Result, anyhow};

use crate::decode_transfer_address;

#[derive(Serialize, Deserialize)]
pub struct TransferSenderRequestPayload {
    pub statechain_id: String,
    pub auth_sig: String, // signed_statechain_id
    pub new_user_auth_key: String,
    pub batch_id: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct TransferSenderResponsePayload {
    pub x1: String,
}

// Step 7. Owner 1 then concatinates the Tx0 outpoint with the Owner 2 public key (O2) and signs it with their key o1 to generate SC_sig_1.
pub fn create_transfer_signature(recipient_address: &str, input_txid: &str, input_vout: u32, client_seckey: &str) ->  Result<String> {

    // new_user_pubkey: PublicKey, input_txid: &Txid, input_vout: u32, client_seckey: &SecretKey

    let (_, recipient_user_pubkey, _) = decode_transfer_address(recipient_address)?;

    let input_txid = Txid::from_str(&input_txid)?;
    let client_seckey = PrivateKey::from_wif(client_seckey)?.inner;

    let secp = Secp256k1::new();
    let keypair = secp256k1::KeyPair::from_seckey_slice(&secp, client_seckey.as_ref()).unwrap();

    let mut data_to_sign = Vec::<u8>::new();
    data_to_sign.extend_from_slice(&input_txid[..]);
    data_to_sign.extend_from_slice(&input_vout.to_le_bytes());
    data_to_sign.extend_from_slice(&recipient_user_pubkey.serialize()[..]);

    let msg = Message::from_hashed_data::<sha256::Hash>(&data_to_sign);
    let signature = secp.sign_schnorr(&msg, &keypair);

    Ok(signature.to_string())
}
