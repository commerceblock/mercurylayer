use std::{str::FromStr, collections::BTreeMap};

use crate::{error::MercuryError, utils::get_network};

use super::{backup_tx::BackupTx, Coin};
use bitcoin::{Transaction, Address, TxOut, Txid, OutPoint, TxIn, ScriptBuf, Witness, absolute, psbt::{Psbt, Input, PsbtSighashType, self}, bip32::{Fingerprint, DerivationPath}, Amount, Network, sighash::{TapSighashType, SighashCache, self, TapSighash}, taproot::{TapLeafHash, self}, secp256k1, key::TapTweak, PrivateKey};
use secp256k1_zkp::{Secp256k1, SecretKey, PublicKey, XOnlyPublicKey};

#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn latest_backup_tx_pays_to_user_pubkey(backup_txs: &Vec<BackupTx>, coin: &Coin, network: &str) -> Result<BackupTx, MercuryError> {

    let network = get_network(network)?;

    let backup_address = Address::from_str(coin.backup_address().as_str())?.require_network(network)?;

    let backup_tx = backup_txs.iter()
        .filter_map(|bkp_tx| {
            let tx_bytes = hex::decode(&bkp_tx.tx()).ok()?;
            let tx: Transaction = bitcoin::consensus::deserialize(&tx_bytes).ok()?;
            
            if tx.output.len() != 1 {
                return None;
            }

            let output: &TxOut = tx.output.get(0)?;
            if backup_address.script_pubkey() == output.script_pubkey {
                Some(bkp_tx)
            } else {
                None
            }
        })
        .max_by_key(|bkp_tx| bkp_tx.tx_n());

    match backup_tx {
        Some(tx) => {
            return Ok(tx.clone());
        },
        None => {
            return Err(MercuryError::NoBackupTransactionFound);
        }
    }
}


#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn create_cpfp_tx(backup_tx: &BackupTx, coin: &Coin, to_address: &str, fee_rate_sats_per_byte: f64, network: &str) -> Result<String, MercuryError> {

    let network = get_network(network)?;

    let tx_bytes = hex::decode(&backup_tx.tx())?;
    let tx: Transaction = bitcoin::consensus::deserialize(&tx_bytes)?;

    if tx.output.len() != 1 {
        return Err(MercuryError::UnkownNetwork);
    }

    let output: &TxOut = tx.output.get(0).unwrap();

    let backup_address = Address::from_str(coin.backup_address().as_str())?.require_network(network)?;

    if backup_address.script_pubkey() != output.script_pubkey {
        return Err(MercuryError::BackupTransactionDoesNotPayUser);
    }

    let input_tx_hash = tx.txid();
    let input_vout = 0;

    let to_address = Address::from_str(to_address)?.require_network(network)?;

    let input_amount: u64 = output.value;

    let outputs = vec![
        TxOut { value: input_amount, script_pubkey: to_address.script_pubkey() },
    ];

    let tx = create_transaction(&input_tx_hash, input_vout, &coin, input_amount, &outputs, network)?;

    let absolute_fee: u64 = (tx.vsize() as f64 * fee_rate_sats_per_byte).ceil() as u64;

    let amount_out = input_amount as i64 - absolute_fee as i64;

    if amount_out < 0 {
        return Err(MercuryError::FeeTooHigh);
    }

    let outputs = vec![
        TxOut { value: amount_out as u64, script_pubkey: to_address.script_pubkey() },
    ];

    let tx = create_transaction(&input_tx_hash, input_vout, &coin, input_amount, &outputs, network)?;

    let tx_bytes = bitcoin::consensus::encode::serialize(&tx);
    let encoded_signed_tx = hex::encode(tx_bytes);
    
    Ok(encoded_signed_tx)
}

fn create_transaction(input_tx_hash: &Txid, input_vout: u32, coin: &Coin, input_amount: u64, outputs: &Vec<TxOut>, network: Network) -> Result<Transaction, MercuryError> {

    let secp = Secp256k1::new();

    let input_utxo = OutPoint { txid: input_tx_hash.clone(), vout: input_vout };
    let input = TxIn {
        previous_output: input_utxo,
        script_sig: ScriptBuf::new(),
        sequence: bitcoin::Sequence(0xFFFFFFFF), // Ignore nSequence.
        witness: Witness::default(),
    };

    let tx1 = Transaction {
        version: 2,
        lock_time: absolute::LockTime::ZERO,
        input: [input].to_vec(),
        output: outputs.clone(),
    };
    let mut psbt = Psbt::from_unsigned_tx(tx1)?;

    let input_public_key = PublicKey::from_str(&coin.user_pubkey())?;
    let input_x_only_public_key = input_public_key.x_only_public_key().0;

    let mut origins = BTreeMap::new();
    origins.insert(
        input_x_only_public_key,
        (
            vec![],
            (
                Fingerprint::from_str(&coin.fingerprint()).unwrap(),
                DerivationPath::from_str(&coin.derivation_path()).unwrap(),
            ),
        ),
    );

    let mut psbt_inputs = Vec::<Input>::new();

    let backup_address = Address::from_str(coin.backup_address().as_str())?.require_network(network)?;
    let input_script_pubkey = backup_address.script_pubkey();

    let mut input = Input {
        witness_utxo: {
            let amount = Amount::from_sat(input_amount);
            Some(TxOut { value: amount.to_sat(), script_pubkey: input_script_pubkey.clone() })
        },
        tap_key_origins: origins.clone(),
        ..Default::default()
    };
    let ty = PsbtSighashType::from_str("SIGHASH_ALL").unwrap();
    input.sighash_type = Some(ty);
    input.tap_internal_key = Some(input_x_only_public_key);
    psbt_inputs.push(input);


    psbt.inputs = psbt_inputs;

    // SIGNER
    let unsigned_tx = psbt.unsigned_tx.clone();

    let mut input_txouts = Vec::<TxOut>::new();
    input_txouts.push(TxOut { value: input_amount, script_pubkey: input_script_pubkey });

    let vout = 0;
    let input = psbt.inputs.iter_mut().nth(vout).unwrap();

    let hash_ty = input
        .sighash_type
        .and_then(|psbt_sighash_type| psbt_sighash_type.taproot_hash_ty().ok())
        .unwrap_or(TapSighashType::All);

    let hash = SighashCache::new(&unsigned_tx).taproot_key_spend_signature_hash(
        vout,
        &sighash::Prevouts::All(&input_txouts.as_slice()),
        hash_ty,
    )?;

    let secret_key = PrivateKey::from_wif(&coin.user_privkey())?.inner;

    sign_psbt_taproot(
        &secret_key,
        input.tap_internal_key.unwrap(),
        None,
        input,
        hash,
        hash_ty,
        &secp,
    );

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
