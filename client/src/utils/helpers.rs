use std::str::FromStr;

use bitcoin::{TxIn, Transaction, TxOut, Address, Network, sighash::{SighashCache, EcdsaSighashType}, hashes::sha256d, PublicKey};

use super::error::CError;

pub const FEE: u64 = 141;

// type conversion
pub fn to_bitcoin_public_key(pk: curv::elliptic::curves::secp256_k1::PK) -> bitcoin::PublicKey {
    bitcoin::PublicKey::from_slice(&pk.0.serialize()).unwrap()
}

/// Build funding tx spending inputs to p2wpkh address P for amount A
pub fn tx_funding_build(
    inputs: &Vec<TxIn>,
    p_address: &String,
    amount: &u64,
    fee: &u64,
    fee_addr: &String,
    change_addr: &String,
    change_amount: &u64,
    network: Network,
) -> Result<Transaction, CError> {
    if FEE + fee >= *amount {
        return Err(CError::SharedLibError(
            "Not enough value to cover fee.".to_string(),
        ));
    }

    let mut outputs = vec![
        TxOut {
            script_pubkey: Address::from_str(p_address)?.require_network(network)?.script_pubkey(),
            value: *amount,
        },
        TxOut {
            script_pubkey: Address::from_str(change_addr)?.require_network(network)?.script_pubkey(),
            value: *change_amount - FEE,
        },
    ];

    if *fee != 0 {
        outputs.push(
            TxOut {
                script_pubkey: Address::from_str(fee_addr)?.require_network(network)?.script_pubkey(),
                value: *fee,
            });
    }

    let tx_0 = Transaction {
        version: 2,
        lock_time: bitcoin::absolute::LockTime::ZERO,
        input: inputs.to_vec(),
        output: outputs
    };
    Ok(tx_0)
}


/// Get sig hash for some transaction input.
/// Arguments: tx, index of input, address being spent from and amount
pub fn get_sighash(
    tx: &Transaction,
    tx_index: &usize,
    address_pk: &PublicKey,
    network: &String,
) -> sha256d::Hash {
    let comp = SighashCache::new(tx);
    // let pk_btc = bitcoin::secp256k1::PublicKey::from_slice(&address_pk.serialize())
    //     .expect("failed to convert public key");

    //let pk_btc = to_bitcoin_public_key(*address_pk);

    let script_pubkey = bitcoin::Address::p2pkh(
        &address_pk,
        network.parse::<Network>().unwrap(),
    )
    .script_pubkey();

    comp.legacy_signature_hash(
        tx_index.to_owned(),
        &script_pubkey,
        EcdsaSighashType::All.to_u32(),
    ).unwrap()
    .as_raw_hash()
    .to_owned()
}