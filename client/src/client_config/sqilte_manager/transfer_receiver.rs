use bitcoin::{Address, Txid};
use secp256k1_zkp::{PublicKey, SecretKey, schnorr::Signature};
use sqlx::Row;

use crate::client_config::ClientConfig;

impl ClientConfig {
    pub async fn get_all_auth_pubkey(&self) -> Vec::<(SecretKey, PublicKey, SecretKey, PublicKey)>{
        let rows = sqlx::query("SELECT auth_seckey, auth_pubkey, client_seckey_share, client_pubkey_share FROM signer_data")
            .fetch_all(&self.pool)
            .await
            .unwrap();
    
        let mut auth_pubkeys = Vec::<(SecretKey, PublicKey, SecretKey, PublicKey)>::new();
    
        for row in rows {
    
            let auth_secret_key_bytes = row.get::<Vec<u8>, _>("auth_seckey");
            let auth_secret_key = SecretKey::from_slice(&auth_secret_key_bytes).unwrap();
    
            let auth_pubkey_bytes = row.get::<Vec<u8>, _>("auth_pubkey");
            let auth_pubkey = PublicKey::from_slice(&auth_pubkey_bytes).unwrap();
    
            let client_seckey_share_bytes = row.get::<Vec<u8>, _>("client_seckey_share");
            let client_seckey_share = SecretKey::from_slice(&client_seckey_share_bytes).unwrap();
    
            let client_pubkey_bytes = row.get::<Vec<u8>, _>("client_pubkey_share");
            let client_pubkey = PublicKey::from_slice(&client_pubkey_bytes).unwrap();
    
            auth_pubkeys.push((auth_secret_key, auth_pubkey, client_seckey_share, client_pubkey));
        }
    
        auth_pubkeys
    }

    pub async fn insert_or_update_new_statechain(
        &self,
        statechain_id: &str, 
        amount: u32,  
        server_pubkey_share: &PublicKey, 
        aggregated_pubkey: &PublicKey, 
        p2tr_agg_address: &Address, 
        client_pubkey_share: &PublicKey,
        signed_statechain_id: &Signature,
        txid: &Txid,
        vout: u32,
        locktime: u32,
        vec_backup_transactions: &Vec<mercury_lib::transfer::ReceiverBackupTransaction>) {
    
        let mut transaction = self.pool.begin().await.unwrap();
    
        let query = "\
            DELETE FROM backup_transaction \
            WHERE statechain_id = $1";
    
        let _ = sqlx::query(query)
            .bind(statechain_id)
            .execute(&mut *transaction)
            .await
            .unwrap();
        
        let query = "\
            DELETE FROM statechain_data \
            WHERE statechain_id = $1";
    
        let _ = sqlx::query(query)
            .bind(statechain_id)
            .execute(&mut *transaction)
            .await
            .unwrap();
    
        let query = "\
            INSERT INTO statechain_data (statechain_id, amount, server_pubkey_share, aggregated_pubkey, p2tr_agg_address, funding_txid, funding_vout, client_pubkey_share, signed_statechain_id, locktime, status) \
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'AVAILABLE')";
    
        let _ = sqlx::query(query)
            .bind(statechain_id)
            .bind(amount)
            .bind(server_pubkey_share.serialize().to_vec())
            .bind(aggregated_pubkey.serialize().to_vec())
            .bind(p2tr_agg_address.to_string())
            .bind(txid.to_string())
            .bind(vout)
            .bind(client_pubkey_share.serialize().to_vec())
            .bind(signed_statechain_id.to_string())
            .bind(locktime)
            .execute(&mut *transaction)
            .await
            .unwrap();
    
        for backup_tx in vec_backup_transactions {
            
            let query = "INSERT INTO backup_transaction \
                (tx_n, statechain_id, client_public_nonce, server_public_nonce, client_pubkey, server_pubkey, blinding_factor, backup_tx, recipient_address) \
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)";
    
            let tx_bytes = bitcoin::consensus::encode::serialize(&backup_tx.tx);
                
            let _ = sqlx::query(query)
                .bind(backup_tx.tx_n)
                .bind(statechain_id)
                .bind(backup_tx.client_public_nonce.serialize().to_vec())
                .bind(backup_tx.server_public_nonce.serialize().to_vec())
                .bind(backup_tx.client_public_key.serialize().to_vec())
                .bind(backup_tx.server_public_key.serialize().to_vec())
                .bind(backup_tx.blinding_factor.as_bytes().to_vec())
                .bind(tx_bytes)
                .bind(backup_tx.recipient_address.clone())
                .execute(&mut *transaction)
                .await
                .unwrap();
        }
    
        transaction.commit().await.unwrap();
        
    }
}