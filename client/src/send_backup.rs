use std::{collections::{HashMap, BTreeMap}, str::FromStr};

use bitcoin::{Address, TxOut, Transaction, OutPoint, TxIn, ScriptBuf, Witness, absolute, psbt::{Psbt, Input, PsbtSighashType, self}, bip32::{Fingerprint, DerivationPath}, Amount, sighash::{TapSighashType, SighashCache, self, TapSighash}, taproot::{TapLeafHash, self}, secp256k1, key::TapTweak};
use electrum_client::ListUnspentRes;
use secp256k1_zkp::{SecretKey, XOnlyPublicKey, PublicKey, Secp256k1};
use sqlx::{Sqlite, Row};

use crate::electrum;

#[derive(Debug)]
pub struct AddressInfo {
    pub address: Address,
    pub secret_key: SecretKey,
    pub xonly_public_key: XOnlyPublicKey,
    pub fingerprint: String,
    pub derivation_path: String,
    /// Confirmation height of the transaction that created this output.
    pub height: usize,
    /// Txid of the transaction
    pub tx_hash: bitcoin::Txid,
    /// Index of the output in the transaction.
    pub tx_pos: usize,
    /// Value of the output.
    pub value: u64,
}

pub async fn get_address_info(pool: &sqlx::Pool<Sqlite>, list_utxo: Vec::<(ListUnspentRes, Address)>) -> Vec::<AddressInfo> {

    let mut list_unspent = Vec::<AddressInfo>::new(); 

    for (utxo, backup_address) in list_utxo {

        let query = "SELECT client_seckey_share, client_pubkey_share, fingerprint, agg_key_derivation_path \
            FROM signer_data \
            WHERE backup_address = $1";

        let row = sqlx::query(query)
            .bind(&backup_address.to_string())
            .fetch_one(pool)
            .await
            .unwrap();

        let secret_key_bytes = row.get::<Vec<u8>, _>("client_seckey_share");
        let secret_key = SecretKey::from_slice(&secret_key_bytes).unwrap();

        let public_key_bytes = row.get::<Vec<u8>, _>("client_pubkey_share");
        let xonly_public_key = PublicKey::from_slice(&public_key_bytes).unwrap().x_only_public_key().0;

        let fingerprint = row.get::<String, _>("fingerprint");
        let derivation_path = row.get::<String, _>("agg_key_derivation_path");

        list_unspent.push(AddressInfo {
            address: backup_address,
            secret_key,
            xonly_public_key,
            fingerprint,
            derivation_path,
            height: utxo.height,
            tx_hash: utxo.tx_hash,
            tx_pos: utxo.tx_pos,
            value: utxo.value,
        });
    }

    list_unspent

}

pub fn send_all_funds(list_utxo: &Vec::<AddressInfo>, to_address: &Address, fee_rate_sats_per_byte: u64) {

    let input_amount: u64 = list_utxo.iter().map(|s| s.value).sum();

    let outputs = vec![
        TxOut { value: input_amount, script_pubkey: to_address.script_pubkey() },
    ];

    let tx = create_transaction(list_utxo, &outputs).unwrap();

    let absolute_fee: u64 = tx.vsize() as u64 * fee_rate_sats_per_byte;

    let amount_out = input_amount - absolute_fee;

    let outputs = vec![
            TxOut { value: amount_out, script_pubkey: to_address.script_pubkey() },
    ];

    let tx = create_transaction(list_utxo, &outputs).unwrap();
   
    let client = electrum_client::Client::new("tcp://127.0.0.1:50001").unwrap();

    let tx_bytes = bitcoin::consensus::encode::serialize(&tx);
    let txid = electrum::transaction_broadcast_raw(&client, &tx_bytes);

    println!("--> txid sent: {}", txid);


}

fn create_transaction(inputs_info: &Vec::<AddressInfo>, outputs: &Vec<TxOut>) -> Result<Transaction, Box<dyn std::error::Error>> {

    let secp = Secp256k1::new();

    let mut tx_inputs = Vec::<bitcoin::TxIn>::new();

    let mut secret_keys = HashMap::new();

    for input in inputs_info {
        secret_keys.insert(input.xonly_public_key, input.secret_key);
    }

    for input in inputs_info {
        let input_utxo = OutPoint { txid: input.tx_hash, vout: input.tx_pos as u32 };
        let input = TxIn {
            previous_output: input_utxo,
            script_sig: ScriptBuf::new(),
            sequence: bitcoin::Sequence(0xFFFFFFFF), // Ignore nSequence.
            witness: Witness::default(),
        };
        tx_inputs.push(input);
    }

    let tx1 = Transaction {
        version: 2,
        lock_time: absolute::LockTime::ZERO,
        input: tx_inputs,
        output: outputs.clone(),
    };
    let mut psbt = Psbt::from_unsigned_tx(tx1).unwrap();

    let mut origins = BTreeMap::new();
    for input in inputs_info {
        origins.insert(
            input.xonly_public_key,
            (
                vec![],
                (
                    Fingerprint::from_str(&input.fingerprint).unwrap(),
                    DerivationPath::from_str(&input.derivation_path).unwrap(),
                ),
            ),
        );
    }

    let mut psbt_inputs = Vec::<Input>::new();

    for input_info in inputs_info {
        let mut input = Input {
            witness_utxo: {
                let script_pubkey = input_info.address.script_pubkey();
                let amount = Amount::from_sat(input_info.value);
    
                Some(TxOut { value: amount.to_sat(), script_pubkey })
            },
            tap_key_origins: origins.clone(),
            ..Default::default()
        };
        let ty = PsbtSighashType::from_str("SIGHASH_ALL").unwrap();
        input.sighash_type = Some(ty);
        input.tap_internal_key = Some(input_info.xonly_public_key);
        psbt_inputs.push(input);
    }

    psbt.inputs = psbt_inputs;

    // SIGNER
    let unsigned_tx = psbt.unsigned_tx.clone();

    let mut input_txouts = Vec::<TxOut>::new();
    for input_info in inputs_info {
        input_txouts.push(TxOut { value: input_info.value, script_pubkey: input_info.address.script_pubkey() });
    }

    psbt.inputs.iter_mut().enumerate().try_for_each::<_, Result<(), Box<dyn std::error::Error>>>(
        |(vout, input)| {

            let hash_ty = input
                .sighash_type
                .and_then(|psbt_sighash_type| psbt_sighash_type.taproot_hash_ty().ok())
                .unwrap_or(TapSighashType::All);

            let hash = SighashCache::new(&unsigned_tx).taproot_key_spend_signature_hash(
                vout,
                &sighash::Prevouts::All(&input_txouts.as_slice()),
                hash_ty,
            ).unwrap();

            let secret_key = secret_keys.get(&input.tap_internal_key.ok_or("Internal key missing in PSBT")?).unwrap();

            sign_psbt_taproot(
                &secret_key,
                input.tap_internal_key.unwrap(),
                None,
                input,
                hash,
                hash_ty,
                &secp,
            );

            Ok(())
        },
    ).unwrap();

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
    
    //let mut prev_out_verify = Vec::<bitcoin::TxOut>::new();
    for input in inputs_info {
        let script_pubkey_hex = input.address.script_pubkey().to_hex_string();
        let amount = Amount::from_sat(input.value);

        //prev_out_verify.push(TxOut { value: amount.to_sat(), script_pubkey });
        tx.verify(|_| {
            Some(TxOut { 
                value: amount.to_sat(), 
                script_pubkey: ScriptBuf::from_hex(&script_pubkey_hex).unwrap() 
            })
        })
        .expect("failed to verify transaction");
    }

    Ok(tx)
}

fn sign_psbt_taproot(
    secret_key: &SecretKey,
    pubkey: XOnlyPublicKey,
    leaf_hash: Option<TapLeafHash>,
    psbt_input: &mut psbt::Input,
    hash: TapSighash,
    hash_ty: TapSighashType,
    secp: &Secp256k1<secp256k1::All>,
) {
    let keypair = secp256k1::KeyPair::from_seckey_slice(secp, secret_key.as_ref()).unwrap();
    let keypair = match leaf_hash {
        None => keypair.tap_tweak(secp, psbt_input.tap_merkle_root).to_inner(),
        Some(_) => keypair, // no tweak for script spend
    };

    let sig = secp.sign_schnorr(&hash.into(), &keypair);

    let final_signature = taproot::Signature { sig, hash_ty };

    if let Some(lh) = leaf_hash {
        psbt_input.tap_script_sigs.insert((pubkey, lh), final_signature);
    } else {
        psbt_input.tap_key_sig = Some(final_signature);
    }
}