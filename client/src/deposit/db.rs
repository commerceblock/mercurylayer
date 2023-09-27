use bitcoin::{Address, Txid};
use secp256k1_zkp::{PublicKey, XOnlyPublicKey, schnorr::Signature};
use sqlx::{Sqlite, Row};

use crate::error::CError;

pub async fn insert_agg_pub_key(pool: &sqlx::Pool<Sqlite>, 
    statechain_id: &str, 
    amount: u32,  
    server_pubkey_share: &PublicKey, 
    aggregated_xonly_pubkey: &XOnlyPublicKey, 
    p2tr_agg_address: &Address, 
    client_pubkey_share: &PublicKey,
    signed_statechain_id: &Signature) -> Result<(), CError> {

    let query = "\
        INSERT INTO statechain_data (statechain_id, amount, server_pubkey_share, aggregated_xonly_pubkey, p2tr_agg_address, client_pubkey_share, signed_statechain_id) \
        VALUES ($1, $2, $3, $4, $5, $6, $7)";

    let _ = sqlx::query(query)
        .bind(statechain_id)
        .bind(amount)
        .bind(server_pubkey_share.serialize().to_vec())
        .bind(aggregated_xonly_pubkey.serialize().to_vec())
        .bind(p2tr_agg_address.to_string())
        .bind(client_pubkey_share.serialize().to_vec())
        .bind(signed_statechain_id.to_string())
        .execute(pool)
        .await
        .unwrap();

    Ok(())

}

pub async fn update_funding_tx_outpoint(pool: &sqlx::Pool<Sqlite>, txid: &Txid, vout: u32, statechain_id: &str) {

    let query = "\
        UPDATE statechain_data \
        SET funding_txid = $1, funding_vout = $2 \
        WHERE statechain_id = $3";

    let _ = sqlx::query(query)
        .bind(&txid.to_string())
        .bind(vout)
        .bind(statechain_id)
        .execute(pool)
        .await
        .unwrap();
}

pub async fn get_backup_tx(pool: &sqlx::Pool<Sqlite>, statechain_id: &str) -> Vec<u8> {
    
    let query = "\
        SELECT backup_tx \
        FROM backup_transaction \
        WHERE tx_n = (SELECT MAX(tx_n) FROM backup_transaction WHERE statechain_id = $1)
        AND statechain_id = $1";

    let row = sqlx::query(query)
        .bind(statechain_id)
        .fetch_one(pool)
        .await
        .unwrap();

    let tx_bytes = row.get::<Vec<u8>, _>("backup_tx");

    tx_bytes
}

pub async fn insert_transaction(pool: &sqlx::Pool<Sqlite>, tx_bytes: &Vec<u8>, client_pub_nonce: &[u8; 66], blinding_factor: &[u8; 32], statechain_id: &str, recipient_address: &str){ 

    let row = sqlx::query("SELECT MAX(tx_n) FROM backup_transaction WHERE statechain_id = $1")
        .bind(statechain_id)
        .fetch_one(pool)
        .await
        .unwrap();

    let mut tx_n = row.get::<u32, _>(0);

    tx_n = tx_n + 1;

    let query = "INSERT INTO backup_transaction (tx_n, statechain_id, client_public_nonce, blinding_factor, backup_tx, recipient_address) \
        VALUES ($1, $2, $3, $4, $5, $6)";
        let _ = sqlx::query(query)
            .bind(tx_n)
            .bind(statechain_id)
            .bind(client_pub_nonce.to_vec())
            .bind(blinding_factor.to_vec())
            .bind(tx_bytes)
            .bind(recipient_address)
            .execute(pool)
            .await
            .unwrap();

}