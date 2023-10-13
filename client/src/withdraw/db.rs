use std::str::FromStr;

use bitcoin::{Network, Address, Txid};
use secp256k1_zkp::{PublicKey, SecretKey, schnorr::Signature};
use sqlx::{Sqlite, Row};

use super::CoinKeyDetails;

pub async fn get_coin_and_key_info(pool: &sqlx::Pool<Sqlite>, statechain_id: &str, network: Network) -> CoinKeyDetails {

    let query = "SELECT \
        sid.client_seckey_share, \
        sid.client_pubkey_share, \
        std.amount, \
        std.server_pubkey_share, \
        std.aggregated_pubkey, \
        std.p2tr_agg_address, \
        sid.auth_seckey, \
        std.signed_statechain_id, \
        std.funding_txid, \
        std.funding_vout \
        FROM signer_data sid INNER JOIN statechain_data std \
        ON sid.client_pubkey_share = std.client_pubkey_share \
        WHERE std.statechain_id = $1";

    let row = sqlx::query(query)
        .bind(statechain_id)
        .fetch_one(pool)
        .await
        .unwrap();

    let amount = row.get::<u32, _>("amount");

    let client_seckey_share_bytes = row.get::<Vec<u8>, _>("client_seckey_share");
    let client_seckey_share = SecretKey::from_slice(&client_seckey_share_bytes).unwrap();

    let server_pubkey_share_bytes = row.get::<Vec<u8>, _>("server_pubkey_share");
    let server_pubkey_share = PublicKey::from_slice(&server_pubkey_share_bytes).unwrap();

    let aggregated_pubkey_bytes = row.get::<Vec<u8>, _>("aggregated_pubkey");
    let aggregated_pubkey = PublicKey::from_slice(&aggregated_pubkey_bytes).unwrap();

    let agg_address_str = row.get::<String, _>("p2tr_agg_address");
    let p2tr_agg_address = Address::from_str(&agg_address_str).unwrap().require_network(network).unwrap();

    let client_pubkey_share_bytes = row.get::<Vec<u8>, _>("client_pubkey_share");
    let client_pubkey_share = PublicKey::from_slice(&client_pubkey_share_bytes).unwrap();

    let auth_seckey_bytes = row.get::<Vec<u8>, _>("auth_seckey");
    let auth_seckey = SecretKey::from_slice(&auth_seckey_bytes).unwrap();

    let signed_statechain_id = row.get::<String, _>("signed_statechain_id");
    let signed_statechain_id = Signature::from_str(&signed_statechain_id).unwrap();

    let utxo_tx_hash = row.get::<String, _>("funding_txid");
    let utxo_tx_hash = Txid::from_str(&utxo_tx_hash).unwrap();

    let utxo_vout = row.get::<u32, _>("funding_vout");

    let row = sqlx::query("SELECT MAX(tx_n) FROM backup_transaction WHERE statechain_id = $1")
        .bind(statechain_id)
        .fetch_one(pool)
        .await
        .unwrap();

    let mut new_tx_n = row.get::<u32, _>(0);

    new_tx_n = new_tx_n + 1;

    let coin_key_details = CoinKeyDetails {
        new_tx_n,
        client_seckey: client_seckey_share,
        client_pubkey: client_pubkey_share,
        amount: amount as u64,
        server_pubkey: server_pubkey_share,
        aggregated_pubkey,
        p2tr_agg_address,
        auth_seckey,
        signed_statechain_id,
        utxo_tx_hash,
        utxo_vout,
    };

    coin_key_details
}
