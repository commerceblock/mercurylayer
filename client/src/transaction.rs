use std::{str::FromStr, collections::BTreeMap};

use bitcoin::{Txid, ScriptBuf, Transaction, absolute, TxIn, OutPoint, Witness, TxOut, psbt::{Psbt, Input, PsbtSighashType}, sighash::{TapSighashType, SighashCache, self, TapSighash}, secp256k1, taproot::{TapTweakHash, self}, hashes::{Hash, sha256}};
use secp256k1_zkp::{SecretKey, PublicKey, XOnlyPublicKey, Secp256k1, schnorr::Signature, Message, musig::{MusigSessionId, MusigPubNonce, MusigKeyAggCache, MusigAggNonce, BlindingFactor, MusigSession, MusigPartialSignature}, new_musig_nonce_pair, KeyPair};
use serde::{Serialize, Deserialize};
use sqlx::{Sqlite, Row};

use crate::error::CError;

async fn count_backup_tx(pool: &sqlx::Pool<Sqlite>, statechain_id: &str) -> u32 {

    let row = sqlx::query("SELECT count(*) FROM backup_transaction WHERE statechain_id = $1")
        .bind(statechain_id)
        .fetch_one(pool)
        .await
        .unwrap();

    let count = row.get::<u32, _>(0);

    count
}

pub async fn new(pool: &sqlx::Pool<Sqlite>, statechain_id: &str,) -> Result<(), CError> {
    let endpoint = "http://127.0.0.1:8000";
    let path = "info/config";

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.get(&format!("{}/{}", endpoint, path));

    let value = match request.send().await {
        Ok(response) => {
            let text = response.text().await.unwrap();
            text
        },
        Err(err) => {
            return Err(CError::Generic(err.to_string()));
        },
    };

    let value: serde_json::Value = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));

    let initlock = value.get("initlock").unwrap().as_u64().unwrap();
    let interval = value.get("interval").unwrap().as_u64().unwrap();
    let qt_backup_tx = count_backup_tx(pool, statechain_id).await;

    println!("initlock {}", initlock);
    println!("interval {}", interval);
    println!("qt_backup_tx {}", qt_backup_tx);

    Ok(())

}

pub async fn create(
    block_height: u32,
    statechain_id: &str,
    signed_statechain_id: &Signature,
    client_seckey: &SecretKey,
    client_pubkey: &PublicKey,
    server_pubkey: &PublicKey,
    input_txid: Txid, 
    input_vout: u32, 
    input_pubkey: &XOnlyPublicKey, 
    input_scriptpubkey: &ScriptBuf, 
    input_amount: u64, 
    output: TxOut) -> Result<(Transaction, MusigPubNonce, BlindingFactor), Box<dyn std::error::Error>> {

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
    input.tap_internal_key = Some(input_pubkey.to_owned());
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

        let (sig, client_pub_nonce, blinding_factor) = musig_sign_psbt_taproot(
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


    Ok((tx, client_pub_nonce, blinding_factor))
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
pub struct PartialSignatureRequestPayload<'r> {
    statechain_id: &'r str,
    keyaggcoef: &'r str,
    negate_seckey: u8,
    session: &'r str,
    signed_statechain_id: &'r str,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PartialSignatureResponsePayload<'r> {
    partial_sig: &'r str,
}

/*
async fn update_commitments(pool: &sqlx::Pool<Sqlite>, client_sec_nonce: &[u8; 132], blinding_factor: &[u8; 32], client_pubkey: &PublicKey) {

    let query = "\
        UPDATE signer_data \
        SET client_sec_nonce = $1, blinding_factor = $2 \
        WHERE client_pubkey_share = $3";

    let _ = sqlx::query(query)
        .bind(client_sec_nonce.to_vec())
        .bind(blinding_factor.to_vec())
        .bind(&client_pubkey.serialize().to_vec())
        .execute(pool)
        .await
        .unwrap();
}
 */

async fn musig_sign_psbt_taproot(
    statechain_id: &str,
    signed_statechain_id: &Signature,
    client_seckey: &SecretKey,
    client_pubkey: &PublicKey,
    server_pubkey: &PublicKey,
    aggregated_pubkey: &XOnlyPublicKey,
    hash: TapSighash,
    secp: &Secp256k1<secp256k1::All>,
)  -> Result<(Signature, MusigPubNonce, BlindingFactor), CError>  {
    let msg: Message = hash.into();

    let client_session_id = MusigSessionId::new(&mut rand::thread_rng());

    let (client_sec_nonce, client_pub_nonce) = new_musig_nonce_pair(&secp, client_session_id, None, Some(client_seckey.to_owned()), client_pubkey.to_owned(), None, None).unwrap();

    let r2_commitment = sha256::Hash::hash(&client_sec_nonce.serialize());

    let blinding_factor = BlindingFactor::new(&mut rand::thread_rng());
    let blind_commitment = sha256::Hash::hash(blinding_factor.as_bytes());

    // update_commitments(pool, &client_sec_nonce.serialize(), blinding_factor.as_bytes(), client_pubkey).await;

    let endpoint = "http://127.0.0.1:8000";
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

    let server_pub_nonce_bytes = hex::decode(server_pubnonce_hex).unwrap();
    
    let server_pub_nonce = MusigPubNonce::from_slice(server_pub_nonce_bytes.as_slice()).unwrap();

    let mut key_agg_cache = MusigKeyAggCache::new(&secp, &[client_pubkey.to_owned(), server_pubkey.to_owned()]);

    let tap_tweak = TapTweakHash::from_key_and_tweak(key_agg_cache.agg_pk(), None);
    let tap_tweak_bytes = tap_tweak.as_byte_array();

    // tranform tweak: Scalar to SecretKey
    let tweak = SecretKey::from_slice(tap_tweak_bytes).unwrap();

    let tweaked_pubkey = key_agg_cache.pubkey_xonly_tweak_add(secp, tweak).unwrap();

    let aggnonce = MusigAggNonce::new(&secp, &[client_pub_nonce, server_pub_nonce]);

    let session = MusigSession::new_blinded(
        &secp,
        &key_agg_cache,
        aggnonce,
        msg,
        &blinding_factor
    );

    let client_keypair = KeyPair::from_secret_key(&secp, &client_seckey);

    let client_partial_sig = session.partial_sign(
        &secp,
        client_sec_nonce,
        &client_keypair,
        &key_agg_cache,
    ).unwrap();

    assert!(session.partial_verify(
        &secp,
        &key_agg_cache,
        client_partial_sig,
        client_pub_nonce,
        client_pubkey.to_owned(),
    ));

    let (key_agg_coef, negate_seckey) = session.get_keyaggcoef_and_negation_seckey(&secp, &key_agg_cache, &server_pubkey);

    let negate_seckey = match negate_seckey {
        true => 1,
        false => 0,
    };

    let payload = PartialSignatureRequestPayload {
        statechain_id,
        keyaggcoef: &hex::encode(key_agg_coef.serialize()),
        negate_seckey,
        session: &hex::encode(session.serialize()),
        signed_statechain_id: &signed_statechain_id.to_string(),
    };

    let endpoint = "http://127.0.0.1:8000";
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

    assert!(session.partial_verify(
        &secp,
        &key_agg_cache,
        server_partial_sig,
        server_pub_nonce,
        server_pubkey.to_owned(),
    ));

    let sig = session.partial_sig_agg(&[client_partial_sig, server_partial_sig]);
    let agg_pk = key_agg_cache.agg_pk();

    assert!(agg_pk.eq(aggregated_pubkey));

    assert!(secp.verify_schnorr(&sig, &msg, &tweaked_pubkey.x_only_public_key().0).is_ok());
   
    Ok((sig, client_pub_nonce, blinding_factor))
}

pub async fn insert_transaction(pool: &sqlx::Pool<Sqlite>, tx_bytes: &Vec<u8>, client_pub_nonce: &[u8; 66], blinding_factor: &[u8; 32], statechain_id: &str) { 

    let row = sqlx::query("SELECT MAX(tx_n) FROM backup_transaction WHERE statechain_id = $1")
        .bind(statechain_id)
        .fetch_one(pool)
        .await
        .unwrap();

    let mut tx_n = row.get::<u32, _>(0);

    tx_n = tx_n + 1;

    let query = "INSERT INTO backup_transaction (tx_n, statechain_id, client_public_nonce, blinding_factor, backup_tx) \
        VALUES ($1, $2, $3, $4, $5)";
        let _ = sqlx::query(query)
            .bind(tx_n)
            .bind(statechain_id)
            .bind(client_pub_nonce.to_vec())
            .bind(blinding_factor.to_vec())
            .bind(tx_bytes)
            .execute(pool)
            .await
            .unwrap();

}