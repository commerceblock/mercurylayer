use bitcoin::{Transaction, block};
use secp256k1_zkp::PublicKey;
use sqlx::{Sqlite, Row};

use crate::error::CError;

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

pub async fn init(pool: &sqlx::Pool<Sqlite>, new_user_pubkey: PublicKey, new_auth_pubkey: PublicKey, statechain_id: &str ) -> Result<(), CError>{

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

    create_backup_tx_to_receiver(&pool, &tx1.tx, new_user_pubkey, &statechain_id).await;

    Ok(())
}

async fn get_statechain_coin_details(pool: &sqlx::Pool<Sqlite>, statechain_id: &str) {

}

pub async fn create_backup_tx_to_receiver(pool: &sqlx::Pool<Sqlite>, tx0: &Transaction, new_user_pubkey: PublicKey, statechain_id: &str) {

    let lock_time = tx0.lock_time;
    assert!(lock_time.is_block_height());
    let block_height = lock_time.to_consensus_u32();

    assert!(tx0.input.len() == 1);
    let input = &tx0.input[0];
    let input_txid = input.previous_output.txid;
    let input_vout = input.previous_output.vout;



    println!("block_height: {}", block_height);
}