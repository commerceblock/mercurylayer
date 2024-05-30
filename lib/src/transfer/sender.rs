use std::str::FromStr;

use bitcoin::{secp256k1, hashes::sha256, Txid, PrivateKey};
use secp256k1_zkp::{Secp256k1, Message, Scalar};
use serde::{Serialize, Deserialize};
use serde_json::json;

use crate::{decode_transfer_address, error::MercuryError, wallet::{BackupTx, Coin}};

use super::TransferMsg;

#[derive(Serialize, Deserialize)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
pub struct TransferSenderRequestPayload {
    pub statechain_id: String,
    pub auth_sig: String, // signed_statechain_id
    pub new_user_auth_key: String,
    pub batch_id: Option<String>,
}

#[derive(Serialize, Deserialize)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
pub struct TransferSenderResponsePayload {
    pub x1: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
pub struct TransferUpdateMsgRequestPayload {
    pub statechain_id: String,
    pub auth_sig: String, // signed_statechain_id
    pub new_user_auth_key: String,
    pub enc_transfer_msg: String,
}

// Step 7. Owner 1 then concatinates the Tx0 outpoint with the Owner 2 public key (O2) and signs it with their key o1 to generate SC_sig_1.
#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn create_transfer_signature(recipient_address: &str, input_txid: &str, input_vout: u32, client_seckey: &str) ->  Result<String, MercuryError> {

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

#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn create_transfer_update_msg(x1: &str, recipient_address: &str, coin: &Coin, transfer_signature: &str, backup_transactions: &Vec<BackupTx>) -> Result<TransferUpdateMsgRequestPayload, MercuryError> {

    let (_, _, recipient_auth_pubkey) = decode_transfer_address(recipient_address)?;  

    let client_seckey = PrivateKey::from_wif(&coin.user_privkey)?.inner;
    let client_public_key = coin.user_pubkey.to_string();

    let x1 = hex::decode(x1)?;
    let x1: [u8; 32] = x1.try_into().unwrap();
    let x1 = Scalar::from_be_bytes(x1)?;
    
    let t1 = client_seckey.add_tweak(&x1)?;

    let statechain_id = coin.statechain_id.as_ref().unwrap();
    let signed_statechain_id = coin.signed_statechain_id.as_ref().unwrap();

    let transfer_msg = TransferMsg {
        statechain_id: statechain_id.to_string(),
        transfer_signature: transfer_signature.to_string(),
        backup_transactions: backup_transactions.to_owned(),
        t1: t1.secret_bytes(),
        user_public_key: client_public_key,
    };

    let transfer_msg_json = json!(&transfer_msg);

    let transfer_msg_json_str = serde_json::to_string_pretty(&transfer_msg_json)?;

    let msg = transfer_msg_json_str.as_bytes();

    let serialized_new_auth_pubkey = &recipient_auth_pubkey.serialize();
    let encrypted_msg = ecies::encrypt(serialized_new_auth_pubkey, msg);

    if encrypted_msg.is_err() {
        return Err(MercuryError::SecpError);
    }

    let encrypted_msg = encrypted_msg.unwrap();

    let encrypted_msg_string = hex::encode(&encrypted_msg);

    let transfer_update_msg_request_payload = TransferUpdateMsgRequestPayload {
        statechain_id: statechain_id.to_string(),
        auth_sig: signed_statechain_id.to_string(),
        new_user_auth_key: recipient_auth_pubkey.to_string(),
        enc_transfer_msg: encrypted_msg_string.clone(),
    };

    Ok(transfer_update_msg_request_payload)
}
 
