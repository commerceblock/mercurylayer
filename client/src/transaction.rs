use std::{str::FromStr, collections::BTreeMap};

use bitcoin::{Txid, ScriptBuf, Transaction, absolute, TxIn, OutPoint, Witness, TxOut, psbt::{Psbt, Input, PsbtSighashType}, sighash::{TapSighashType, SighashCache, self, TapSighash}, secp256k1, taproot::{TapTweakHash, self}, hashes::{Hash, sha256}, Address};
use rand::Rng;
use secp256k1_zkp::{SecretKey, PublicKey,  Secp256k1, schnorr::Signature, Message, musig::{MusigSessionId, MusigPubNonce, BlindingFactor, MusigSession, MusigPartialSignature, blinded_musig_pubkey_xonly_tweak_add, blinded_musig_negate_seckey, MusigAggNonce}, new_musig_nonce_pair, KeyPair};
use serde::{Serialize, Deserialize};

use crate::{error::CError, client_config::ClientConfig};

/// The purpose of this function is to get a random locktime for the withdrawal transaction.
/// This is done to improve privacy and discourage fee sniping.
/// This function assumes that the block_height is the current block height.
fn get_locktime_for_withdrawal_transaction (block_height: u32) -> u32 {

    let mut locktime = block_height as i32;

    let mut rng = rand::thread_rng();
    let number = rng.gen_range(0..=10);

    // sometimes locktime is set a bit further back, for privacy reasons
    if number == 0 {
        locktime = locktime - rng.gen_range(0..=99);
    }

    std::cmp::max(0, locktime) as u32
}

pub async fn new_backup_transaction(
    client_config: &ClientConfig,
    block_height: u32,
    statechain_id: &str,
    signed_statechain_id: &Signature,
    client_seckey: &SecretKey,
    client_pubkey: &PublicKey,
    server_pubkey: &PublicKey,
    input_txid: Txid, 
    input_vout: u32, 
    input_pubkey: &PublicKey, 
    input_scriptpubkey: &ScriptBuf, 
    input_amount: u64, 
    to_address: &Address,
    is_withdrawal: bool) 
    -> Result<(Transaction, MusigPubNonce, MusigPubNonce, BlindingFactor), CError>  {

    const BACKUP_TX_SIZE: u64 = 112; // virtual size one input P2TR and one output P2TR
    // 163 is the real size one input P2TR and one output P2TR

    let info_config_data = crate::utils::info_config().await.unwrap();

    let initlock = info_config_data.initlock;
    let interval = info_config_data.interval;
    let fee_rate_sats_per_byte = info_config_data.fee_rate_sats_per_byte;

    let qt_backup_tx = client_config.count_backup_tx(statechain_id).await as u32;

    let absolute_fee: u64 = BACKUP_TX_SIZE * fee_rate_sats_per_byte; 
    let amount_out = input_amount - absolute_fee;

    let tx_out = TxOut { value: amount_out, script_pubkey: to_address.script_pubkey() };

    // if qt_backup_tx == 0, it means this is the first backup transaction (Tx0)
    // In this case, the block_height is equal to the current block height
    // Otherwise, block_height is equal to the Tx0.lock_time + initlock
    let initlock = if qt_backup_tx == 0 { initlock } else { 0 };

    let block_height = if is_withdrawal { get_locktime_for_withdrawal_transaction(block_height) } else { (block_height + initlock) - (interval * qt_backup_tx) };

    let (tx, client_pub_nonce, server_pub_nonce, blinding_factor) = create(
        client_config,
        block_height,
        statechain_id,
        signed_statechain_id,
        client_seckey,
        client_pubkey,
        server_pubkey,
        input_txid, 
        input_vout, 
        input_pubkey, 
        input_scriptpubkey, 
        input_amount, 
        tx_out).await.unwrap();

    Ok((tx, client_pub_nonce, server_pub_nonce, blinding_factor))

}

async fn create(
    client_config: &ClientConfig,
    block_height: u32,
    statechain_id: &str,
    signed_statechain_id: &Signature,
    client_seckey: &SecretKey,
    client_pubkey: &PublicKey,
    server_pubkey: &PublicKey,
    input_txid: Txid, 
    input_vout: u32, 
    input_pubkey: &PublicKey, 
    input_scriptpubkey: &ScriptBuf, 
    input_amount: u64, 
    output: TxOut) -> Result<(Transaction, MusigPubNonce, MusigPubNonce, BlindingFactor), Box<dyn std::error::Error>> {

    let input_xonly_pubkey = input_pubkey.x_only_public_key().0;

    let outputs = [output].to_vec();

    let lock_time = absolute::LockTime::from_height(block_height).expect("valid height");

    let tx1 = Transaction {
        version: 2,
        lock_time,
        input: vec![TxIn {
            previous_output: OutPoint { txid: input_txid, vout: input_vout },
            script_sig: ScriptBuf::new(),
            sequence: bitcoin::Sequence(0xFFFFFFFF), // Ignore nSequence.
            witness: Witness::default(),
        }],
        output: outputs,
    };
    let mut psbt = Psbt::from_unsigned_tx(tx1)?;

    let mut input = Input {
        witness_utxo: Some(TxOut { value: input_amount, script_pubkey: input_scriptpubkey.to_owned() }),
        ..Default::default()
    };
    let ty = PsbtSighashType::from_str("SIGHASH_ALL")?;
    input.sighash_type = Some(ty);
    input.tap_internal_key = Some(input_xonly_pubkey.to_owned());
    psbt.inputs = vec![input];

    let secp = Secp256k1::new();
    
    let unsigned_tx = psbt.unsigned_tx.clone();

    // There must not be more than one input.
    // The input is the funding transaction and the output the backup address.
    // If there is more than one input, the UPDATE command below will rewrite the client_sec_nonce and blinding_factor.
    assert!(psbt.inputs.len() == 1);

    // for (vout, input) in psbt.inputs.iter_mut().enumerate() {

        let vout = 0;
        let input = psbt.inputs.iter_mut().nth(vout).unwrap();

        let hash_ty = input
            .sighash_type
            .and_then(|psbt_sighash_type| psbt_sighash_type.taproot_hash_ty().ok())
            .unwrap_or(TapSighashType::All);

        let hash = SighashCache::new(&unsigned_tx).taproot_key_spend_signature_hash(
            vout,
            &sighash::Prevouts::All(&[TxOut {
                value: input.witness_utxo.as_ref().unwrap().value,
                script_pubkey: input.witness_utxo.as_ref().unwrap().script_pubkey.clone(),
            }]),
            hash_ty,
        ).unwrap();

        let (sig, client_pub_nonce, server_pub_nonce, blinding_factor) = musig_sign_psbt_taproot(
            client_config,
            statechain_id,
            signed_statechain_id,
            client_seckey,
            client_pubkey,
            server_pubkey,
            input_pubkey,
            hash,
            &secp,
        ).await.unwrap();

        let final_signature = taproot::Signature { sig, hash_ty };

        input.tap_key_sig = Some(final_signature);
    // }

    // FINALIZER
    psbt.inputs.iter_mut().for_each(|input| {
        let mut script_witness: Witness = Witness::new();
        script_witness.push(input.tap_key_sig.unwrap().to_vec());
        input.final_script_witness = Some(script_witness);

        // Clear all the data fields as per the spec.
        input.partial_sigs = BTreeMap::new();
        input.sighash_type = None;
        input.redeem_script = None;
        input.witness_script = None;
        input.bip32_derivation = BTreeMap::new();
    });

    let tx = psbt.extract_tx();

    tx.verify(|_| {
        Some(TxOut {
            value: input_amount,
            script_pubkey: input_scriptpubkey.to_owned(),
        })
    })
    .expect("failed to verify transaction");


    Ok((tx, client_pub_nonce, server_pub_nonce, blinding_factor))
}


#[derive(Serialize, Deserialize)]
pub struct SignFirstRequestPayload<'r> {
    statechain_id: &'r str,
    r2_commitment: &'r str,
    blind_commitment: &'r str,
    signed_statechain_id: &'r str,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ServerPublicNonceResponsePayload<'r> {
    server_pubnonce: &'r str,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PartialSignatureResponsePayload<'r> {
    partial_sig: &'r str,
}

async fn musig_sign_psbt_taproot(
    client_config: &ClientConfig,
    statechain_id: &str,
    signed_statechain_id: &Signature,
    client_seckey: &SecretKey,
    client_pubkey: &PublicKey,
    server_pubkey: &PublicKey,
    input_pubkey: &PublicKey,
    hash: TapSighash,
    secp: &Secp256k1<secp256k1::All>,
)  -> Result<(Signature, MusigPubNonce, MusigPubNonce, BlindingFactor), CError>  {
    let msg: Message = hash.into();

    let client_session_id = MusigSessionId::new(&mut rand::thread_rng());

    let (client_sec_nonce, client_pub_nonce) = new_musig_nonce_pair(&secp, client_session_id, None, Some(client_seckey.to_owned()), client_pubkey.to_owned(), None, None).unwrap();

    let r2_commitment = sha256::Hash::hash(&client_pub_nonce.serialize());

    let blinding_factor = BlindingFactor::new(&mut rand::thread_rng());
    let blind_commitment = sha256::Hash::hash(blinding_factor.as_bytes());

    let endpoint = client_config.statechain_entity.clone();
    let path = "sign/first";

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.post(&format!("{}/{}", endpoint, path));

    let sign_first_request_payload = SignFirstRequestPayload {
        statechain_id,
        r2_commitment: &r2_commitment.to_string(),
        blind_commitment: &blind_commitment.to_string(),
        signed_statechain_id: &signed_statechain_id.to_string(),
    };

    let value = match request.json(&sign_first_request_payload).send().await {
        Ok(response) => {
            let text = response.text().await.unwrap();
            text
        },
        Err(err) => {
            return Err(CError::Generic(err.to_string()));
        },
    };

    let response: ServerPublicNonceResponsePayload = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));

    let mut server_pubnonce_hex = response.server_pubnonce.to_string();

    if server_pubnonce_hex.starts_with("0x") {
        server_pubnonce_hex = server_pubnonce_hex[2..].to_string();
    }

    let server_pub_nonce_bytes = hex::decode(server_pubnonce_hex.clone()).unwrap();
    
    let server_pub_nonce = MusigPubNonce::from_slice(server_pub_nonce_bytes.as_slice()).unwrap();

    let aggregate_pubkey = client_pubkey.combine(&server_pubkey).unwrap();

    if aggregate_pubkey != input_pubkey.to_owned() {
        return Err(CError::Generic("Input public key is different than the combination of client and server public keys.".to_string()));
    }

    let tap_tweak = TapTweakHash::from_key_and_tweak(aggregate_pubkey.x_only_public_key().0, None);
    let tap_tweak_bytes = tap_tweak.as_byte_array();

    // tranform tweak: Scalar to SecretKey
    let tweak = SecretKey::from_slice(tap_tweak_bytes).unwrap();

    let (parity_acc, output_pubkey, out_tweak32) = blinded_musig_pubkey_xonly_tweak_add(&secp, &aggregate_pubkey, tweak);

    let aggnonce = MusigAggNonce::new(&secp, &[client_pub_nonce, server_pub_nonce]);

    let session = MusigSession::new_blinded_without_key_agg_cache(
        &secp,
        &output_pubkey,
        aggnonce,
        msg,
        None,
        &blinding_factor,
        out_tweak32
    );

    let negate_seckey = blinded_musig_negate_seckey(
        &secp,
        &output_pubkey,
        parity_acc,
    );

    let client_keypair = KeyPair::from_secret_key(&secp, &client_seckey);

    let client_partial_sig = session.blinded_partial_sign_without_keyaggcoeff(&secp, client_sec_nonce, &client_keypair, negate_seckey).unwrap();

    assert!(session.blinded_musig_partial_sig_verify(&secp, &client_partial_sig, &client_pub_nonce, &client_pubkey, &output_pubkey, parity_acc));

    session.remove_fin_nonce_from_session();

    let negate_seckey = match negate_seckey {
        true => 1,
        false => 0,
    };

    let blinded_session = session.remove_fin_nonce_from_session();

    let payload = mercury_lib::sign::PartialSignatureRequestPayload {
        statechain_id,
        negate_seckey,
        session: &hex::encode(blinded_session.serialize()),
        signed_statechain_id: &signed_statechain_id.to_string(),
        server_pub_nonce: server_pubnonce_hex.as_str(),
    };

    let path = "sign/second";

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.post(&format!("{}/{}", endpoint, path));

    let value = match request.json(&payload).send().await {
        Ok(response) => {
            let text = response.text().await.unwrap();
            text
        },
        Err(err) => {
            return Err(CError::Generic(err.to_string()));
        },
    };

    let response: PartialSignatureResponsePayload = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));

    let mut server_partial_sig_hex = response.partial_sig.to_string();

    if server_partial_sig_hex.starts_with("0x") {
        server_partial_sig_hex = server_partial_sig_hex[2..].to_string();
    }

    let server_partial_sig_bytes = hex::decode(server_partial_sig_hex).unwrap();

    let server_partial_sig = MusigPartialSignature::from_slice(server_partial_sig_bytes.as_slice()).unwrap();

    assert!(session.blinded_musig_partial_sig_verify(&secp, &server_partial_sig, &server_pub_nonce, &server_pubkey, &output_pubkey, parity_acc));

    let sig = session.partial_sig_agg(&[client_partial_sig, server_partial_sig]);

    let x_only_key_tweaked = output_pubkey.x_only_public_key().0;

    assert!(secp.verify_schnorr(&sig, &msg, &x_only_key_tweaked).is_ok());
   
    Ok((sig, client_pub_nonce, server_pub_nonce, blinding_factor))
}
