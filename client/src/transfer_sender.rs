use std::str::FromStr;

use bitcoin::{Transaction, block, Address, Network, secp256k1, hashes::sha256};
use secp256k1_zkp::{PublicKey, SecretKey, XOnlyPublicKey, Secp256k1, Message};
use sqlx::{Sqlite, Row};

use crate::{error::CError, electrum};

struct BackupTransaction {
    tx_n: u32,
    tx: Transaction,
    client_public_nonce: Vec<u8>,
    blinding_factor: Vec<u8>,
}

async fn get_backup_transactions(pool: &sqlx::Pool<Sqlite>, statechain_id: &str) -> Vec::<BackupTransaction> {

    let rows = sqlx::query("SELECT * FROM backup_transaction WHERE statechain_id = $1")
        .bind(statechain_id)
        .fetch_all(pool)
        .await
        .unwrap();

    let mut backup_transactions = Vec::<BackupTransaction>::new();

    for row in rows {
        let tx_n = row.get::<u32, _>("tx_n");
        let tx_bytes = row.get::<Vec<u8>, _>("backup_tx");
        let client_public_nonce = row.get::<Vec<u8>, _>("client_public_nonce");
        let blinding_factor = row.get::<Vec<u8>, _>("blinding_factor");
        let tx = bitcoin::consensus::deserialize::<Transaction>(&tx_bytes).unwrap();
        
        backup_transactions.push(BackupTransaction {
            tx_n,
            tx,
            client_public_nonce,
            blinding_factor,
        });
    }

    backup_transactions

}  

pub async fn init(pool: &sqlx::Pool<Sqlite>, new_user_pubkey: PublicKey, new_auth_pubkey: PublicKey, statechain_id: &str, network: Network) -> Result<(), CError>{

    let mut backup_transactions = get_backup_transactions(&pool, &statechain_id).await;

    if backup_transactions.len() == 0 {
        return Err(CError::Generic("No backup transactions found".to_string()));
    }   

    backup_transactions.sort_by(|a, b| b.tx_n.cmp(&a.tx_n));

    let tx1 = &backup_transactions[0];

    println!("tx1: {}", tx1.tx.txid());
    println!("tx1_n: {}", tx1.tx_n);
    println!("tx1_client_public_nonce: {}", hex::encode(&tx1.client_public_nonce));
    println!("tx1_blinding_factor: {}", hex::encode(&tx1.blinding_factor));

    create_backup_tx_to_receiver(&pool, &tx1.tx, new_user_pubkey, &statechain_id, network).await;

    Ok(())
}

struct StatechainCoinDetails {
    pub client_seckey: SecretKey,
    pub client_pubkey: PublicKey,
    pub amount: u64,
    pub server_pubkey: PublicKey,
    pub aggregated_xonly_pubkey: XOnlyPublicKey,
    pub p2tr_agg_address: Address,
    pub auth_seckey: SecretKey,
}

async fn get_statechain_coin_details(pool: &sqlx::Pool<Sqlite>, statechain_id: &str, network: Network) -> StatechainCoinDetails {

    let query = "SELECT client_seckey_share, client_pubkey_share, amount, server_pubkey_share, aggregated_xonly_pubkey, p2tr_agg_address, auth_seckey \
            FROM signer_data \
            WHERE statechain_id = $1";

    let row = sqlx::query(query)
        .bind(statechain_id)
        .fetch_one(pool)
        .await
        .unwrap();

    let secret_key_bytes = row.get::<Vec<u8>, _>("client_seckey_share");
    let client_seckey = SecretKey::from_slice(&secret_key_bytes).unwrap();

    let client_public_key_bytes = row.get::<Vec<u8>, _>("client_pubkey_share");
    let client_pubkey = PublicKey::from_slice(&client_public_key_bytes).unwrap();

    let amount = row.get::<i64, _>("amount") as u64;

    let server_public_key_bytes = row.get::<Vec<u8>, _>("server_pubkey_share");
    let server_pubkey = PublicKey::from_slice(&server_public_key_bytes).unwrap();

    let agg_public_key_bytes = row.get::<Vec<u8>, _>("aggregated_xonly_pubkey");
    let aggregated_xonly_pubkey = XOnlyPublicKey::from_slice(&agg_public_key_bytes).unwrap();

    let agg_address_str = row.get::<String, _>("p2tr_agg_address");
    let p2tr_agg_address = Address::from_str(&agg_address_str).unwrap().require_network(network).unwrap();

    let auth_seckey_bytes = row.get::<Vec<u8>, _>("auth_seckey");
    let auth_seckey = SecretKey::from_slice(&auth_seckey_bytes).unwrap();

    let address = Address::p2tr(&Secp256k1::new(), aggregated_xonly_pubkey, None, network);

    assert!(address.to_string() == p2tr_agg_address.to_string());

    StatechainCoinDetails {
        client_seckey,
        client_pubkey,
        amount,
        server_pubkey,
        aggregated_xonly_pubkey,
        p2tr_agg_address,
        auth_seckey,
    }

}

pub async fn create_backup_tx_to_receiver(pool: &sqlx::Pool<Sqlite>, tx0: &Transaction, new_user_pubkey: PublicKey, statechain_id: &str, network: Network) {

    let lock_time = tx0.lock_time;
    assert!(lock_time.is_block_height());
    let block_height = lock_time.to_consensus_u32();

    assert!(tx0.input.len() == 1);
    let input = &tx0.input[0];
    
    let statechain_coin_details = get_statechain_coin_details(&pool, &statechain_id, network).await;

    let auth_secret_key = statechain_coin_details.auth_seckey;

    let secp = Secp256k1::new();
    let keypair = secp256k1::KeyPair::from_seckey_slice(&secp, auth_secret_key.as_ref()).unwrap();
    let msg = Message::from_hashed_data::<sha256::Hash>(statechain_id.to_string().as_bytes());
    let signed_statechain_id = secp.sign_schnorr(&msg, &keypair);

    let client_seckey = statechain_coin_details.client_seckey;
    let client_pubkey = statechain_coin_details.client_pubkey;
    let server_pubkey = statechain_coin_details.server_pubkey;
    let input_txid = input.previous_output.txid;
    let input_vout = input.previous_output.vout;
    let input_pubkey =statechain_coin_details.aggregated_xonly_pubkey;
    let input_scriptpubkey = statechain_coin_details.p2tr_agg_address.script_pubkey();
    let input_amount = statechain_coin_details.amount;

    let to_address = Address::p2tr(&Secp256k1::new(), new_user_pubkey.x_only_public_key().0, None, network);

    let (new_tx, client_pub_nonce, blinding_factor) = crate::transaction::new_backup_transaction(
        pool, 
        block_height,
        statechain_id,
        &signed_statechain_id,
        &client_seckey,
        &client_pubkey,
        &server_pubkey,
        input_txid, 
        input_vout, 
        &input_pubkey, 
        &input_scriptpubkey, 
        input_amount, 
        &to_address).await.unwrap();

    let tx_bytes = bitcoin::consensus::encode::serialize(&new_tx);

    let client = electrum_client::Client::new("tcp://127.0.0.1:50001").unwrap();
    
    let txid = electrum::transaction_broadcast_raw(&client, &tx_bytes);

    println!("txid sent: {}", txid);

}