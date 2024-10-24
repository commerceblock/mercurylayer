// the functions in this file are called by the unifii library
// They were created because we would need to expose to the unifii library some low level functions and struct that are not part of the wallet API
// TODO: 1. verify if they can also be used with WASM, unifyify both interface
//       2. use these same function in Rust client

use serde::{Deserialize, Serialize};

use crate::{decode_transfer_address, transfer::{receiver::{StatechainInfoResponsePayload, TransferReceiverRequestPayload}, TransferMsg, TxOutpoint}, wallet::{BackupTx, Coin, Wallet}, MercuryError};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
pub struct DecodedSCAddress {
    version: u8,
    user_pubkey: String,
    auth_pubkey: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
pub struct FFITransferMsg {
    pub statechain_id: String,
    pub transfer_signature: String,
    pub backup_transactions: Vec<BackupTx>,
    pub t1: Vec<u8>,
    pub user_public_key: String,
}

#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn get_new_coin(wallet: &Wallet) -> Result<Coin, MercuryError> {
    wallet.get_new_coin()
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

fn ffi_to_transfer_msg(ffi_msg: FFITransferMsg) -> Result<TransferMsg, MercuryError> {
    if ffi_msg.t1.len() != 32 {
        return Err(MercuryError::T1MustBeExactly32BytesError);
    }
    let mut t1_array = [0u8; 32];
    t1_array.copy_from_slice(&ffi_msg.t1);
    Ok(TransferMsg {
        statechain_id: ffi_msg.statechain_id,
        transfer_signature: ffi_msg.transfer_signature,
        backup_transactions: ffi_msg.backup_transactions,
        t1: t1_array,
        user_public_key: ffi_msg.user_public_key,
    })
}

fn transfer_to_ffi_msg(transfer_msg: TransferMsg) -> FFITransferMsg {
    FFITransferMsg {
        statechain_id: transfer_msg.statechain_id,
        transfer_signature: transfer_msg.transfer_signature,
        backup_transactions: transfer_msg.backup_transactions,
        t1: Vec::from(transfer_msg.t1),
        user_public_key: transfer_msg.user_public_key,
    }
}

#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn fii_decrypt_transfer_msg(encrypted_message: &str, private_key_wif: &str) -> Result<FFITransferMsg, MercuryError> {
    let transfer_msg = crate::transfer::receiver::decrypt_transfer_msg(encrypted_message, private_key_wif)?;
    Ok(transfer_to_ffi_msg(transfer_msg))
}

#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn ffi_verify_transfer_signature(new_user_pubkey: &str, tx0_outpoint: &TxOutpoint, ffi_transfer_msg: &FFITransferMsg) -> Result<bool, MercuryError> {
    let  transfer_msg = ffi_to_transfer_msg(ffi_transfer_msg.clone())?;
    crate::transfer::receiver::verify_transfer_signature(new_user_pubkey, tx0_outpoint, &transfer_msg)
}

#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn fii_validate_tx0_output_pubkey(enclave_public_key: &str, ffi_transfer_msg: &FFITransferMsg, tx0_outpoint: &TxOutpoint, tx0_hex: &str, network: &str) -> Result<bool, MercuryError> {
    let  transfer_msg = ffi_to_transfer_msg(ffi_transfer_msg.clone())?;
    crate::transfer::receiver::validate_tx0_output_pubkey(enclave_public_key, &transfer_msg, tx0_outpoint, tx0_hex, network)
}

#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn fii_verify_latest_backup_tx_pays_to_user_pubkey(ffi_transfer_msg: &FFITransferMsg, client_pubkey_share: &str, network: &str) -> Result<bool, MercuryError> {
    let  transfer_msg = ffi_to_transfer_msg(ffi_transfer_msg.clone())?;
    crate::transfer::receiver::verify_latest_backup_tx_pays_to_user_pubkey(&transfer_msg, client_pubkey_share, network)
}

#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn fii_create_transfer_receiver_request_payload(statechain_info: &StatechainInfoResponsePayload, ffi_transfer_msg: &FFITransferMsg, coin: &Coin) -> Result<TransferReceiverRequestPayload, MercuryError> {
    let  transfer_msg = ffi_to_transfer_msg(ffi_transfer_msg.clone())?;
    crate::transfer::receiver::create_transfer_receiver_request_payload(statechain_info, &transfer_msg, coin)
}

/* #[cfg_attr(feature = "bindings", uniffi::export)]
pub fn ffi_validate_signature_scheme(
    ffi_transfer_msg: &FFITransferMsg, 
    statechain_info: &StatechainInfoResponsePayload, 
    tx0_hex: &str,
    current_blockheight: u32,
    fee_rate_tolerance: f64, 
    current_fee_rate_sats_per_byte: f64,
    lockheight_init:u32,
    interval: u32) -> Result<u32, MercuryError> {

    let transfer_msg = ffi_to_transfer_msg(ffi_transfer_msg.clone())?;
    crate::transfer::receiver::validate_signature_scheme(&transfer_msg, &statechain_info, tx0_hex, current_blockheight, fee_rate_tolerance, current_fee_rate_sats_per_byte, lockheight_init, interval)
} */
