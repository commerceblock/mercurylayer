use secp256k1_zkp::PublicKey;
use sqlx::Row;

use crate::{client_config::ClientConfig, error::CError};

impl ClientConfig {

    pub async fn insert_transaction(
        &self,
        tx_n: u32, 
        tx_bytes: &Vec<u8>, 
        client_pub_nonce: &[u8; 66], 
        server_pub_nonce: &[u8; 66], 
        client_pubkey: &PublicKey, 
        server_pubkey: &PublicKey, 
        blinding_factor: &[u8; 32], 
        statechain_id: &str, 
        recipient_address: &str) -> Result<(), CError>{ 
    
        let row = sqlx::query("SELECT MAX(tx_n) FROM backup_transaction WHERE statechain_id = $1")
            .bind(statechain_id)
            .fetch_one(&self.pool)
            .await
            .unwrap();
    
        let mut new_tx_n = row.get::<u32, _>(0);
    
        new_tx_n = new_tx_n + 1;
    
        if tx_n != new_tx_n {
            let msg = format!("tx_n {} is not equal to the next tx_n {} in the database", tx_n, new_tx_n).to_string();
            return Err(CError::Generic(msg));
        }
    
        let query = "INSERT INTO backup_transaction \
            (tx_n, statechain_id, client_public_nonce, server_public_nonce, client_pubkey, server_pubkey, blinding_factor, backup_tx, recipient_address) \
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)";
            
        let _ = sqlx::query(query)
            .bind(tx_n)
            .bind(statechain_id)
            .bind(client_pub_nonce.to_vec())
            .bind(server_pub_nonce.to_vec())
            .bind(client_pubkey.serialize().to_vec())
            .bind(server_pubkey.serialize().to_vec())
            .bind(blinding_factor.to_vec())
            .bind(tx_bytes)
            .bind(recipient_address)
            .execute(&self.pool)
            .await
            .unwrap();
    
        Ok(())
    
    }
}