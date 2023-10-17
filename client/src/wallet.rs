use std::str::FromStr;

use bitcoin::{Network, Address, Txid, PrivateKey};
use secp256k1_zkp::SecretKey;
use serde::{Serialize, Deserialize};
use sqlx::{Sqlite, Row};

pub async fn get_all_addresses(pool: &sqlx::Pool<Sqlite>, network: Network) -> (Vec::<Address>, Vec::<Address>){
    let mut agg_addresses = Vec::<Address>::new();
    let mut backup_addresses = Vec::<Address>::new();

    let query = "SELECT backup_address FROM signer_data";

    let rows = sqlx::query(query)
        .fetch_all(pool)
        .await
        .unwrap();

    for row in rows {

        let backup_address_str = row.get::<String, _>("backup_address");
        let backup_address = Address::from_str(&backup_address_str).unwrap().require_network(network).unwrap();
        backup_addresses.push(backup_address);
    }

    let query = "SELECT p2tr_agg_address FROM statechain_data";

    let rows = sqlx::query(query)
        .fetch_all(pool)
        .await
        .unwrap();

    for row in rows {

        let p2tr_agg_address = row.get::<String, _>("p2tr_agg_address");

        if p2tr_agg_address.is_empty() {
            continue;
        }

        let agg_address = Address::from_str(&p2tr_agg_address).unwrap().require_network(network).unwrap();
        agg_addresses.push(agg_address);
    }

    (agg_addresses, backup_addresses)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupTransactionJSON {
    tx_n: u32,
    tx: String,
    client_public_nonce: String,
    blinding_factor: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CoinJSON {
    pub utxo: String,
    pub address: String,
    pub amount: u32,
    pub statechain_id: String,
    pub privkey: String,
    pub auth_key: String,
    pub locktime: u32,
    pub status: String,
    pub tx_withdraw: Option<String>,
    pub backup_txs: Vec<BackupTransactionJSON>,
}

pub async fn get_backup_tx(pool: &sqlx::Pool<Sqlite>, statechain_id: &str) -> Vec::<BackupTransactionJSON> {

    let rows = sqlx::query("SELECT * FROM backup_transaction WHERE statechain_id = $1")
        .bind(statechain_id)
        .fetch_all(pool)
        .await
        .unwrap();

    let mut backup_transactions = Vec::<BackupTransactionJSON>::new();

    for row in rows {
        let row_statechain_id = row.get::<String, _>("statechain_id");
        assert!(row_statechain_id == statechain_id);
        
        let tx_n = row.get::<u32, _>("tx_n");

        let client_public_nonce = row.get::<Vec<u8>, _>("client_public_nonce");
        let client_public_nonce = hex::encode(client_public_nonce);

        let blinding_factor = row.get::<Vec<u8>, _>("blinding_factor");
        let blinding_factor = hex::encode(blinding_factor);

        let tx_bytes = row.get::<Vec<u8>, _>("backup_tx");
        let tx = hex::encode(tx_bytes);

        backup_transactions.push(BackupTransactionJSON {
            tx_n,
            tx,
            client_public_nonce,
            blinding_factor
        });
    }

    backup_transactions

}

pub async fn get_coins(pool: &sqlx::Pool<Sqlite>, network: Network) -> Vec<CoinJSON> {

    let query = "SELECT \
        std.funding_txid, \
        std.funding_vout, \
        std.p2tr_agg_address, \
        std.amount, \
        std.statechain_id, \
        sid.client_seckey_share, \
        sid.auth_seckey, \
        std.locktime, \
        std.status, \
        std.tx_withdraw \
        FROM signer_data sid INNER JOIN statechain_data std \
        ON sid.client_pubkey_share = std.client_pubkey_share";

    let rows = sqlx::query(query)
        .fetch_all(pool)
        .await
        .unwrap();

    let mut coins = Vec::<CoinJSON>::new();

    for row in rows {

        let utxo_tx_hash = row.get::<String, _>("funding_txid");
        let utxo_tx_hash = Txid::from_str(&utxo_tx_hash).unwrap();

        let utxo_vout = row.get::<u32, _>("funding_vout");

        let utxo = format!("{}:{}", utxo_tx_hash, utxo_vout);

        let agg_address_str = row.get::<String, _>("p2tr_agg_address");
        let p2tr_agg_address = Address::from_str(&agg_address_str).unwrap().require_network(network).unwrap();

        let amount = row.get::<u32, _>("amount");

        let statechain_id = row.get::<String, _>("statechain_id");

        let client_seckey_share_bytes = row.get::<Vec<u8>, _>("client_seckey_share");
        let client_seckey_share = SecretKey::from_slice(&client_seckey_share_bytes).unwrap();

        let privkey = PrivateKey::new(client_seckey_share, network);

        let auth_seckey_bytes = row.get::<Vec<u8>, _>("auth_seckey");
        let auth_seckey = SecretKey::from_slice(&auth_seckey_bytes).unwrap();

        let auth_key = PrivateKey::new(auth_seckey, network);

        let locktime = row.get::<u32, _>("locktime");

        let status = row.get::<String, _>("status");

        let tx_withdraw: Option<String> = row.get::<Option<String>, _>("tx_withdraw");

        let backup_txs = get_backup_tx(pool, &statechain_id).await;

        coins.push(CoinJSON {
            utxo,
            address: p2tr_agg_address.to_string(),
            amount,
            statechain_id,
            privkey: privkey.to_wif(),
            auth_key: auth_key.to_wif(),
            locktime,
            status,
            tx_withdraw,
            backup_txs
        });
    }

    coins

    
}