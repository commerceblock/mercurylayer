use std::str::FromStr;

use bitcoin::{PrivateKey, Transaction, hashes::{sha256, Hash}, Txid, Address, sighash::{TapSighashType, SighashCache, self}, TxOut, taproot::TapTweakHash};
use secp256k1_zkp::{PublicKey, schnorr::Signature, Secp256k1, Message, XOnlyPublicKey, musig::{MusigPubNonce, BlindingFactor, blinded_musig_pubkey_xonly_tweak_add, MusigAggNonce, MusigSession}, SecretKey, Scalar, KeyPair};
use serde::{Serialize, Deserialize};

use crate::{error::MercuryError, utils::get_network, wallet::{BackupTx, Coin, CoinStatus, Wallet}};

use super::TransferMsg;

#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
pub struct TransferUnlockRequestPayload { 
    pub statechain_id: String,
    pub auth_sig: String, // signed_statechain_id
    pub auth_pub_key: Option<String>, // public key for verification
}

#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
pub struct TransferReceiverRequestPayload { 
    pub statechain_id: String,
    pub batch_data: Option<String>,
    pub t2: String,
    pub auth_sig: String,
}

#[derive(Serialize, Deserialize)]
#[cfg_attr(feature = "bindings", derive(uniffi::Enum))]
pub enum TransferReceiverError {
    StatecoinBatchLockedError,
    ExpiredBatchTimeError,
}

#[derive(Serialize, Deserialize)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
pub struct TransferReceiverErrorResponsePayload {
    pub code: TransferReceiverError,
    pub message: String,
}

#[derive(Serialize, Deserialize)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
pub struct TransferReceiverPostResponsePayload {
    pub server_pubkey: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
pub struct KeyUpdateResponsePayload { 
    pub statechain_id: String,
    pub t2: String,
    pub x1: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
pub struct GetMsgAddrResponsePayload {
    pub list_enc_transfer_msg: Vec<String>,
}
 
#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
pub struct StatechainInfo {
    pub statechain_id: String,
    pub server_pubnonce: String,
    pub challenge: String,
    pub tx_n: u32,
}

#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
pub struct StatechainInfoResponsePayload {
    pub enclave_public_key: String,
    pub num_sigs: u32,
    pub statechain_info: Vec<StatechainInfo>,
    pub x1_pub: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
pub struct TxOutpoint {
    pub txid: String,
    pub vout: u32,
}

#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
pub struct NewKeyInfo {
    pub aggregate_pubkey: String,
    pub aggregate_address: String,
    pub signed_statechain_id: String,
    pub amount: u32,
}

#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn duplicate_coin_to_initialized_state(wallet: &Wallet, auth_pubkey: &str) -> Result<Coin, MercuryError> {

    let coin = wallet.coins.iter().find(|coin| coin.auth_pubkey == auth_pubkey.to_string());

    if coin.is_none() {
        return Err(MercuryError::CoinNotFound);
    }

    let coin = coin.unwrap();

    Ok(Coin {
        index: coin.index,
        user_privkey: coin.user_privkey.clone(),
        user_pubkey: coin.user_pubkey.clone(),
        auth_privkey: coin.auth_privkey.clone(),
        auth_pubkey: coin.auth_pubkey.clone(),
        derivation_path: coin.derivation_path.clone(),
        fingerprint: coin.fingerprint.clone(),
        address: coin.address.clone(),
        backup_address: coin. backup_address.clone(),
        server_pubkey: None,
        aggregated_pubkey: None,
        aggregated_address: None,
        utxo_txid: None,
        utxo_vout: None,
        amount: None,
        statechain_id: None,
        signed_statechain_id: None,
        locktime: None,
        secret_nonce: None,
        public_nonce: None,
        blinding_factor: None,
        server_public_nonce: None,
        tx_cpfp: None,
        tx_withdraw: None,
        withdrawal_address: None,
        status: CoinStatus::INITIALISED,
        duplicate_index: coin.duplicate_index,
    })
}   

pub fn decrypt_transfer_msg(encrypted_message: &str, private_key_wif: &str) -> Result<TransferMsg, MercuryError> {

    let client_auth_key = PrivateKey::from_wif(private_key_wif)?.inner;

    let decoded_enc_message = hex::decode(encrypted_message)?;

    let decrypted_msg = ecies::decrypt(client_auth_key.secret_bytes().as_slice(), decoded_enc_message.as_slice()).unwrap();

    let decrypted_msg_str = String::from_utf8(decrypted_msg).unwrap();

    let transfer_msg: TransferMsg = serde_json::from_str(decrypted_msg_str.as_str()).unwrap();

    Ok(transfer_msg)
}

#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn get_tx0_outpoint(backup_transactions: &Vec<BackupTx>) -> Result<TxOutpoint, MercuryError> {

    let mut backup_transactions = backup_transactions.clone();

    backup_transactions.sort_by(|a, b| a.tx_n.cmp(&b.tx_n));

    let bkp_tx1 = backup_transactions.first().ok_or(MercuryError::NoBackupTransactionFound)?;

    let tx1: Transaction = bitcoin::consensus::encode::deserialize(&hex::decode(&bkp_tx1.tx)?)?;

    if tx1.input.len() > 1 {
        return Err(MercuryError::Tx1HasMoreThanOneInput);
    }

    if tx1.output.len() > 1 {
        return Err(MercuryError::Tx1HasMoreThanOneInput);
    }

    let tx0_txid = tx1.input[0].previous_output.txid;
    let tx0_vout = tx1.input[0].previous_output.vout as u32;

    Ok(TxOutpoint{ txid: tx0_txid.to_string(), vout: tx0_vout })
}

pub fn verify_transfer_signature(new_user_pubkey: &str, tx0_outpoint: &TxOutpoint, transfer_msg: &TransferMsg) -> Result<bool, MercuryError> {

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

pub fn validate_tx0_output_pubkey(enclave_public_key: &str, transfer_msg: &TransferMsg, tx0_outpoint: &TxOutpoint, tx0_hex: &str, network: &str) -> Result<bool, MercuryError> {

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

pub fn verify_latest_backup_tx_pays_to_user_pubkey(transfer_msg: &TransferMsg, client_pubkey_share: &str, network: &str) -> Result<bool, MercuryError> {

    let client_pubkey_share = PublicKey::from_str(&client_pubkey_share)?;
    
    let network = get_network(&network)?;

    let last_bkp_tx = transfer_msg.backup_transactions.last();

    if last_bkp_tx.is_none() {
        return Err(MercuryError::NoBackupTransactionFound);
    }

    let last_bkp_tx = last_bkp_tx.unwrap();

    let last_tx: Transaction = bitcoin::consensus::encode::deserialize(&hex::decode(&last_bkp_tx.tx)?)?;

    let output = &last_tx.output[0];

    let aggregate_address = Address::p2tr(&Secp256k1::new(), client_pubkey_share.x_only_public_key().0, None, network);

    Ok(output.script_pubkey == aggregate_address.script_pubkey())
}

#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn get_output_address_from_tx0(tx0_outpoint: &TxOutpoint, tx0_hex: &str, network: &str) -> Result<String, MercuryError> {

    let network = get_network(&network)?;

    let tx0: Transaction = bitcoin::consensus::encode::deserialize(&hex::decode(&tx0_hex)?)?;

    let tx0_output = tx0.output[tx0_outpoint.vout as usize].clone();

    let output_script_pubkey = tx0_output.script_pubkey;

    let address = Address::from_script(&output_script_pubkey.as_script(), network)?;

    Ok(address.to_string())
}

pub fn validate_signature_scheme(
    transfer_msg: &TransferMsg, 
    statechain_info: &StatechainInfoResponsePayload, 
    tx0_hex: &str, 
    fee_rate_tolerance: f64, 
    current_fee_rate_sats_per_byte: f64,
    interval: u32) -> Result<u32, MercuryError> {

    let mut previous_lock_time: Option<u32> = None;

    let mut sig_scheme_validation = true;

    for (index, backup_tx) in transfer_msg.backup_transactions.iter().enumerate() {

        let statechain_info = statechain_info.statechain_info.get(index).unwrap();

        let is_signature_valid = verify_transaction_signature(&backup_tx.tx, &tx0_hex, fee_rate_tolerance, current_fee_rate_sats_per_byte);
        if is_signature_valid.is_err() {
            println!("{}", is_signature_valid.err().unwrap().to_string());
            sig_scheme_validation = false;
            break;
        }

        let is_blinded_musig_scheme_valid = verify_blinded_musig_scheme(&backup_tx, &tx0_hex, statechain_info);
        if is_blinded_musig_scheme_valid.is_err() {
            println!("{}", is_blinded_musig_scheme_valid.err().unwrap().to_string());
            sig_scheme_validation = false;
            break;
        }

        if previous_lock_time.is_some() {
            let prev_lock_time = previous_lock_time.unwrap();
            let current_lock_time = crate::utils::get_blockheight(&backup_tx)?;
            if (prev_lock_time - current_lock_time) as i32 != interval as i32 {
                println!("interval is not correct");
                sig_scheme_validation = false;
                break;
            }
        }

        previous_lock_time = Some(crate::utils::get_blockheight(&backup_tx)?);
    }

    if !sig_scheme_validation {
        return Err(MercuryError::SignatureSchemeValidationError);
    }

    if previous_lock_time.is_none() {
        return Err(MercuryError::NoPreviousLockTimeError);
    }

    Ok(previous_lock_time.unwrap())
}

#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn verify_transaction_signature(tx_n_hex: &str, tx0_hex: &str, fee_rate_tolerance: f64, current_fee_rate_sats_per_byte: f64) -> Result<(), MercuryError> {

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
    let fee_rate = fee as f64 / tx_n.vsize() as f64;

    if (fee_rate + fee_rate_tolerance) < current_fee_rate_sats_per_byte {
        return Err(MercuryError::FeeTooLow);
    }

    if (fee_rate - fee_rate_tolerance) > current_fee_rate_sats_per_byte {
        return Err(MercuryError::FeeTooHigh);
    }

    if !Secp256k1::new().verify_schnorr(&signature, &msg, &xonly_pubkey).is_ok() {
        return Err(MercuryError::InvalidSignature);
    }

    Ok(())

}


fn get_tx_hash(tx_0: &Transaction, tx_n: &Transaction) -> Result<Message, MercuryError> {

    let witness = tx_n.input[0].witness.clone();

    if witness.nth(0).is_none() {
        return Err(MercuryError::EmptyWitness);
    }

    let witness_data = witness.nth(0).unwrap();

    let vout = tx_n.input[0].previous_output.vout as usize;

    let tx_0_output = tx_0.output[vout].clone();

    if witness_data.last().is_none() {
        return Err(MercuryError::EmptyWitnessData);
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

#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn verify_blinded_musig_scheme(backup_tx: &BackupTx, tx0_hex: &str, statechain_info: &StatechainInfo) -> Result<(), MercuryError> {

    let client_public_nonce = MusigPubNonce::from_slice(hex::decode(&backup_tx.client_public_nonce)?.as_slice())?;

    let server_public_nonce = MusigPubNonce::from_slice(hex::decode(&backup_tx.server_public_nonce)?.as_slice())?;

    let client_public_key = PublicKey::from_str(&backup_tx.client_public_key)?;

    let server_public_key = PublicKey::from_str(&backup_tx.server_public_key)?;

    let blinding_factor = BlindingFactor::from_slice(hex::decode(&backup_tx.blinding_factor)?.as_slice())?;

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
        return Err(MercuryError::IncorrectChallenge);
    }

    Ok(())
}

fn validate_t1pub(t1: &[u8; 32], x1_pub: &PublicKey, sender_public_key: &PublicKey) -> Result<bool, MercuryError> {

    let secret_t1 = SecretKey::from_slice(t1)?;
    let public_t1 = secret_t1.public_key(&Secp256k1::new());

    let result_pubkey = sender_public_key.combine(&x1_pub)?;

    Ok(result_pubkey == public_t1)
}

fn calculate_t2(transfer_msg: &TransferMsg, client_seckey_share: &SecretKey,) -> Result<SecretKey, MercuryError> {

    let t1 = Scalar::from_be_bytes(transfer_msg.t1)?;

    let negated_seckey = client_seckey_share.negate();

    let t2 = negated_seckey.add_tweak(&t1)?;

    Ok(t2)
}

pub fn create_transfer_receiver_request_payload(statechain_info: &StatechainInfoResponsePayload, transfer_msg: &TransferMsg, coin: &Coin) -> Result<TransferReceiverRequestPayload, MercuryError> {

    if statechain_info.x1_pub.is_none() {
        return Err(MercuryError::NoX1Pub);
    }

    let x1_pub = statechain_info.x1_pub.as_ref().unwrap();

    let x1_pub = PublicKey::from_str(x1_pub)?;

    let sender_public_key = PublicKey::from_str(&transfer_msg.user_public_key)?;

    let client_seckey_share = PrivateKey::from_wif(&coin.user_privkey)?.inner;

    let client_auth_key = PrivateKey::from_wif(&coin.auth_privkey)?.inner;

    if !validate_t1pub(&transfer_msg.t1, &x1_pub, &sender_public_key)? {
        return Err(MercuryError::InvalidT1);
    }

    let t2 = calculate_t2(&transfer_msg, &client_seckey_share)?;

    let t2_hex = hex::encode(t2.secret_bytes());

    let secp = Secp256k1::new();

    let client_auth_keypair = KeyPair::from_seckey_slice(&secp, client_auth_key.as_ref())?;
    let msg = Message::from_hashed_data::<sha256::Hash>(t2_hex.as_bytes());
    let auth_sig = secp.sign_schnorr(&msg, &client_auth_keypair);

    let transfer_receiver_request_payload = TransferReceiverRequestPayload {
        statechain_id: transfer_msg.statechain_id.clone(),
        batch_data: None,
        t2: t2_hex,
        auth_sig: auth_sig.to_string(),
    };

    Ok(transfer_receiver_request_payload)

}

#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn sign_message(message: &str, coin: &Coin) -> Result<String, MercuryError> {

    let client_auth_key = PrivateKey::from_wif(&coin.auth_privkey)?.inner;

    let secp = Secp256k1::new();

    let client_auth_keypair = KeyPair::from_seckey_slice(&secp, client_auth_key.as_ref())?;
    let hashed_msg = Message::from_hashed_data::<sha256::Hash>(message.to_string().as_bytes());
    let signed_message = secp.sign_schnorr(&hashed_msg, &client_auth_keypair);

    Ok(signed_message.to_string())
}

#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn get_new_key_info(server_public_key_hex: &str, coin: &Coin, statechain_id: &str, tx0_outpoint: &TxOutpoint, tx0_hex: &str, network: &str) -> Result<NewKeyInfo, MercuryError> {
    
    let network = get_network(&network)?;

    let client_auth_key = PrivateKey::from_wif(&coin.auth_privkey)?.inner;

    let client_pubkey_share = PublicKey::from_str(&coin.user_pubkey)?;

    let server_pubkey_share = PublicKey::from_str(server_public_key_hex)?;

    let aggregate_pubkey = client_pubkey_share.combine(&server_pubkey_share)?;

    let aggregated_xonly_pubkey = aggregate_pubkey.x_only_public_key().0;

    let secp = Secp256k1::new();

    let aggregate_address = Address::p2tr(&secp, aggregated_xonly_pubkey, None, network);

    let xonly_pubkey = XOnlyPublicKey::from_slice(aggregate_address.script_pubkey()[2..].as_bytes()).unwrap();

    let tx0: Transaction = bitcoin::consensus::encode::deserialize(&hex::decode(&tx0_hex)?)?;

    let tx0_output = tx0.output[tx0_outpoint.vout as usize].clone();

    let tx0_output_xonly_pubkey = XOnlyPublicKey::from_slice(tx0_output.script_pubkey[2..].as_bytes()).unwrap();

    if tx0_output_xonly_pubkey != xonly_pubkey {
        return Err(MercuryError::IncorrectAggregatedPublicKey);
    }

    let p2tr_agg_address = Address::p2tr(&secp, aggregated_xonly_pubkey, None, network);

    let client_auth_keypair = KeyPair::from_seckey_slice(&secp, client_auth_key.as_ref())?;
    let msg = Message::from_hashed_data::<sha256::Hash>(statechain_id.to_string().as_bytes());
    let signed_statechain_id = secp.sign_schnorr(&msg, &client_auth_keypair);

    Ok(NewKeyInfo {
        aggregate_pubkey: aggregate_pubkey.to_string(),
        aggregate_address: p2tr_agg_address.to_string(),
        signed_statechain_id: signed_statechain_id.to_string(),
        amount: tx0_output.value as u32,
    })
}