use bitcoin::{Address, Txid};
use secp256k1_zkp::{PublicKey, schnorr::Signature};
use sqlx::Row;

use crate::{error::CError, client_config::ClientConfig};

impl ClientConfig {
    
    pub async fn insert_agg_pub_key(
        &self,
        token_id: &uuid::Uuid,
        statechain_id: &str, 
        amount: u32,  
        server_pubkey_share: &PublicKey, 
        aggregated_pubkey: &PublicKey, 
        p2tr_agg_address: &Address, 
        client_pubkey_share: &PublicKey,
        signed_statechain_id: &Signature) -> Result<(), CError> {
    
        let query = "\
            INSERT INTO statechain_data (token_id, statechain_id, amount, server_pubkey_share, aggregated_pubkey, p2tr_agg_address, client_pubkey_share, signed_statechain_id, status) \
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'AVAILABLE')";
    
        let _ = sqlx::query(query)
            .bind(token_id.to_string())
            .bind(statechain_id)
            .bind(amount)
            .bind(server_pubkey_share.serialize().to_vec())
            .bind(aggregated_pubkey.serialize().to_vec())
            .bind(p2tr_agg_address.to_string())
            .bind(client_pubkey_share.serialize().to_vec())
            .bind(signed_statechain_id.to_string())
            .execute(&self.pool)
            .await
            .unwrap();
    
        Ok(())
    
    }

    pub async fn update_funding_tx_outpoint(&self, txid: &Txid, vout: u32, statechain_id: &str) {

        let query = "\
            UPDATE statechain_data \
            SET funding_txid = $1, funding_vout = $2 \
            WHERE statechain_id = $3";
    
        let _ = sqlx::query(query)
            .bind(&txid.to_string())
            .bind(vout)
            .bind(statechain_id)
            .execute(&self.pool)
            .await
            .unwrap();
    }

    pub async fn update_locktime(&self, statechain_id: &str, locktime: u32) {

        let query = "\
            UPDATE statechain_data \
            SET locktime = $1 \
            WHERE statechain_id = $2";

        let _ = sqlx::query(query)
            .bind(locktime)
            .bind(statechain_id)
            .execute(&self.pool)
            .await
            .unwrap();
    }

    pub async fn get_backup_tx(&self, statechain_id: &str) -> Vec<u8> {
    
        let query = "\
            SELECT backup_tx \
            FROM backup_transaction \
            WHERE tx_n = (SELECT MAX(tx_n) FROM backup_transaction WHERE statechain_id = $1)
            AND statechain_id = $1";
    
        let row = sqlx::query(query)
            .bind(statechain_id)
            .fetch_one(&self.pool)
            .await
            .unwrap();
    
        let tx_bytes = row.get::<Vec<u8>, _>("backup_tx");
    
        tx_bytes
    }
}
