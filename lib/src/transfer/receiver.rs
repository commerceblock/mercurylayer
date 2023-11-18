use std::str::FromStr;

use bitcoin::{PrivateKey, Transaction, hashes::{sha256, Hash}, Txid, Address, sighash::{TapSighashType, SighashCache, self}, TxOut, taproot::TapTweakHash};
use secp256k1_zkp::{PublicKey, schnorr::Signature, Secp256k1, Message, XOnlyPublicKey, musig::{MusigPubNonce, BlindingFactor, blinded_musig_pubkey_xonly_tweak_add, MusigAggNonce, MusigSession}, SecretKey};
use serde::{Serialize, Deserialize};
use anyhow::{Result, anyhow};

use crate::{wallet::{BackupTx, Coin}, utils::get_network};

use super::TransferMsg;

#[derive(Debug, Serialize, Deserialize)]
pub struct TransferReceiverRequestPayload { 
    pub statechain_id: String,
    pub batch_data: Option<String>,
    pub t2: String,
    pub auth_sig: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KeyUpdateResponsePayload { 
    pub statechain_id: String,
    pub t2: String,
    pub x1: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GetMsgAddrResponsePayload {
    pub list_enc_transfer_msg: Vec<String>,
}
 
#[derive(Debug, Serialize, Deserialize)]
pub struct StatechainInfo {
    pub statechain_id: String,
    pub r2_commitment: String,
    pub blind_commitment: String,
    pub server_pubnonce: String,
    pub challenge: String,
    pub tx_n: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StatechainInfoResponsePayload {
    pub enclave_public_key: String,
    pub num_sigs: u32,
    pub statechain_info: Vec<StatechainInfo>,
    pub x1_pub: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TxOutpoint {
    pub txid: String,
    pub vout: u32,

}

pub fn decrypt_transfer_msg(encrypted_message: &str, private_key_wif: &str) -> Result<TransferMsg> {

    let client_auth_key = PrivateKey::from_wif(private_key_wif)?.inner;

    let decoded_enc_message = hex::decode(encrypted_message)?;

    let decrypted_msg = ecies::decrypt(client_auth_key.secret_bytes().as_slice(), decoded_enc_message.as_slice()).unwrap();

    let decrypted_msg_str = String::from_utf8(decrypted_msg).unwrap();

    let transfer_msg: TransferMsg = serde_json::from_str(decrypted_msg_str.as_str()).unwrap();

    Ok(transfer_msg)
}

pub fn get_tx0_outpoint(backup_transactions: &Vec<BackupTx>) -> Result<TxOutpoint> {

    let mut backup_transactions = backup_transactions.clone();

    backup_transactions.sort_by(|a, b| a.tx_n.cmp(&b.tx_n));

    let bkp_tx1 = backup_transactions.first().ok_or(anyhow!("No backup transaction found"))?;

    let tx1: Transaction = bitcoin::consensus::encode::deserialize(&hex::decode(&bkp_tx1.tx)?)?;

    if tx1.input.len() > 1 {
        return Err(anyhow!("tx1 has more than one input"));
    }

    if tx1.output.len() > 1 {
        return Err(anyhow!("tx1 has more than one output"));
    }

    let tx0_txid = tx1.input[0].previous_output.txid;
    let tx0_vout = tx1.input[0].previous_output.vout as u32;

    Ok(TxOutpoint{ txid: tx0_txid.to_string(), vout: tx0_vout })
}

pub fn verify_transfer_signature(new_user_pubkey: &str, tx0_outpoint: &TxOutpoint, transfer_msg: &TransferMsg) -> Result<bool> {

    let new_user_pubkey = PublicKey::from_str(new_user_pubkey)?;
    let sender_public_key = PublicKey::from_str(&transfer_msg.user_public_key)?.x_only_public_key().0;

    let input_vout = tx0_outpoint.vout;
    let input_txid = Txid::from_str(&tx0_outpoint.txid)?;

    let signature = Signature::from_str(&transfer_msg.transfer_signature)?;

    let secp = Secp256k1::new();

    let mut data_to_verify = Vec::<u8>::new();
    data_to_verify.extend_from_slice(&input_txid[..]);
    data_to_verify.extend_from_slice(&input_vout.to_le_bytes());
    data_to_verify.extend_from_slice(&new_user_pubkey.serialize()[..]);

    let msg = Message::from_hashed_data::<sha256::Hash>(&data_to_verify);

    Ok(secp.verify_schnorr(&signature, &msg, &sender_public_key).is_ok())
}

pub fn validate_tx0_output_pubkey(enclave_public_key: &str, transfer_msg: &TransferMsg, tx0_outpoint: &TxOutpoint, tx0_hex: &str, network: &str) -> Result<bool> {

    let network = get_network(&network)?;

    let enclave_public_key = PublicKey::from_str(enclave_public_key).unwrap();
    let sender_public_key = PublicKey::from_str(&transfer_msg.user_public_key)?;

    let transfer_aggregate_pubkey = sender_public_key.combine(&enclave_public_key).unwrap();
    let transfer_aggregate_xonly_pubkey = transfer_aggregate_pubkey.x_only_public_key().0;

    let secp = Secp256k1::new();

    let transfer_aggregate_address = Address::p2tr(&secp, transfer_aggregate_xonly_pubkey, None, network);

    let transfer_aggregate_xonly_pubkey = XOnlyPublicKey::from_slice(transfer_aggregate_address.script_pubkey()[2..].as_bytes()).unwrap();

    let tx0: Transaction = bitcoin::consensus::encode::deserialize(&hex::decode(&tx0_hex)?)?;

    let tx0_output = tx0.output[tx0_outpoint.vout as usize].clone();

    let tx0_output_xonly_pubkey = XOnlyPublicKey::from_slice(tx0_output.script_pubkey[2..].as_bytes()).unwrap();

    Ok(transfer_aggregate_xonly_pubkey == tx0_output_xonly_pubkey)
}

pub fn verify_latest_backup_tx_pays_to_user_pubkey(transfer_msg: &TransferMsg, client_pubkey_share: &str, network: &str) -> Result<bool> {

    let client_pubkey_share = PublicKey::from_str(&client_pubkey_share)?;
    
    let network = get_network(&network)?;

    let last_bkp_tx = transfer_msg.backup_transactions.last();

    if last_bkp_tx.is_none() {
        return Err(anyhow!("No backup transaction found"));
    }

    let last_bkp_tx = last_bkp_tx.unwrap();

    let last_tx: Transaction = bitcoin::consensus::encode::deserialize(&hex::decode(&last_bkp_tx.tx)?)?;

    let output = &last_tx.output[0];

    let aggregate_address = Address::p2tr(&Secp256k1::new(), client_pubkey_share.x_only_public_key().0, None, network);

    Ok(output.script_pubkey == aggregate_address.script_pubkey())
}

pub fn get_output_address_from_tx0(tx0_outpoint: &TxOutpoint, tx0_hex: &str, network: &str) -> Result<String> {

    let network = get_network(&network)?;

    let tx0: Transaction = bitcoin::consensus::encode::deserialize(&hex::decode(&tx0_hex)?)?;

    let tx0_output = tx0.output[tx0_outpoint.vout as usize].clone();

    let output_script_pubkey = tx0_output.script_pubkey;

    let address = Address::from_script(&output_script_pubkey.as_script(), network)?;

    Ok(address.to_string())
}

pub fn verify_transaction_signature(tx_n_hex: &str, tx0_hex: &str, fee_rate_tolerance: u32, current_fee_rate_sats_per_byte: u32) -> Result<()> {

    let tx_n: Transaction = bitcoin::consensus::encode::deserialize(&hex::decode(&tx_n_hex)?)?;

    let witness = tx_n.input[0].witness.clone();

    let witness_data = witness.nth(0).unwrap();

    // the last element is the hash type
    let signature_data = witness_data.split_last().unwrap().1;

    let signature = Signature::from_slice(signature_data).unwrap();

    let tx0: Transaction = bitcoin::consensus::encode::deserialize(&hex::decode(&tx0_hex)?)?;

    let vout = tx_n.input[0].previous_output.vout as usize;

    let tx0_output = tx0.output[vout].clone();

    let xonly_pubkey = XOnlyPublicKey::from_slice(tx0_output.script_pubkey[2..].as_bytes()).unwrap();

    let sighash_type = TapSighashType::from_consensus_u8(witness_data.last().unwrap().to_owned()).unwrap();

    let hash = SighashCache::new(tx_n.clone()).taproot_key_spend_signature_hash(
        0,
        &sighash::Prevouts::All(&[TxOut {
            value: tx0_output.value,
            script_pubkey: tx0_output.script_pubkey.clone(),
        }]),
        sighash_type,
    ).unwrap();

    let msg: Message = hash.into();

    let fee = tx0_output.value - tx_n.output[0].value;
    let fee_rate = fee / tx_n.vsize() as u64;

    if (fee_rate as i64 + fee_rate_tolerance as i64) < current_fee_rate_sats_per_byte as i64 {
        return Err(anyhow!("Fee rate too low".to_string()));
    }

    if (fee_rate as i64 - fee_rate_tolerance as i64) > current_fee_rate_sats_per_byte as i64 {
        return Err(anyhow!("Fee rate too high".to_string()));
    }

    if !Secp256k1::new().verify_schnorr(&signature, &msg, &xonly_pubkey).is_ok() {
        return Err(anyhow!("Invalid signature".to_string()));
    }

    Ok(())

}

fn get_tx_hash(tx_0: &Transaction, tx_n: &Transaction) -> Result<Message> {

    let witness = tx_n.input[0].witness.clone();

    if witness.nth(0).is_none() {
        return Err(anyhow!("Empty witness"));
    }

    let witness_data = witness.nth(0).unwrap();

    let vout = tx_n.input[0].previous_output.vout as usize;

    let tx_0_output = tx_0.output[vout].clone();

    if witness_data.last().is_none() {
        return Err(anyhow!("Empty witness data"));
    }

    let sighash_type = TapSighashType::from_consensus_u8(witness_data.last().unwrap().to_owned())?;

    let hash = SighashCache::new(tx_n).taproot_key_spend_signature_hash(
        0,
        &sighash::Prevouts::All(&[TxOut {
            value: tx_0_output.value,
            script_pubkey: tx_0_output.script_pubkey.clone(),
        }]),
        sighash_type,
    )?;

    let msg: Message = hash.into();

    Ok(msg)
}

pub fn verify_blinded_musig_scheme(backup_tx: &BackupTx, tx0_hex: &str, statechain_info: &StatechainInfo) -> Result<()> {

    let client_public_nonce = MusigPubNonce::from_slice(hex::decode(&backup_tx.client_public_nonce)?.as_slice())?;

    let server_public_nonce = MusigPubNonce::from_slice(hex::decode(&backup_tx.server_public_nonce)?.as_slice())?;

    let client_public_key = PublicKey::from_str(&backup_tx.client_public_key)?;

    let server_public_key = PublicKey::from_str(&backup_tx.server_public_key)?;

    let blinding_factor = BlindingFactor::from_slice(hex::decode(&backup_tx.blinding_factor)?.as_slice())?;

    let blind_commitment = sha256::Hash::hash(blinding_factor.as_bytes());
    let r2_commitment = sha256::Hash::hash(&client_public_nonce.serialize());

    if statechain_info.blind_commitment != blind_commitment.to_string() {
        return Err(anyhow!("blind_commitment is not correct".to_string()));
    }

    if statechain_info.r2_commitment != r2_commitment.to_string() {
        return Err(anyhow!("r2_commitment is not correct".to_string()));
    }

    let secp = Secp256k1::new();

    let aggregate_pubkey = client_public_key.combine(&server_public_key)?;

    let tap_tweak = TapTweakHash::from_key_and_tweak(aggregate_pubkey.x_only_public_key().0, None);
    let tap_tweak_bytes = tap_tweak.as_byte_array();

    let tweak = SecretKey::from_slice(tap_tweak_bytes)?;

    let (_, output_pubkey, out_tweak32) = blinded_musig_pubkey_xonly_tweak_add(&secp, &aggregate_pubkey, tweak);
    
    let aggnonce = MusigAggNonce::new(&secp, &[client_public_nonce, server_public_nonce]);

    let tx_0: Transaction = bitcoin::consensus::encode::deserialize(&hex::decode(&tx0_hex)?)?;

    let tx_n: Transaction = bitcoin::consensus::encode::deserialize(&hex::decode(&backup_tx.tx)?)?;

    let msg = get_tx_hash(&tx_0, &tx_n)?;

    let session = MusigSession::new_blinded_without_key_agg_cache(
        &secp,
        &output_pubkey,
        aggnonce,
        msg,
        None,
        &blinding_factor,
        out_tweak32
    );
    // END repeated code

    let challenge = session.get_challenge_from_session();
    let challenge = hex::encode(challenge);

    if statechain_info.challenge != challenge {
        return Err(anyhow!("challenge is not correct".to_string()));
    }

    Ok(())

}
 