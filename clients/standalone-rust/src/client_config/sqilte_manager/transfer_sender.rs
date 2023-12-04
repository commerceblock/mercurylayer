use std::str::FromStr;

use bitcoin::{Transaction, Address};
use secp256k1_zkp::{PublicKey, SecretKey, Secp256k1};
use sqlx::Row;

use crate::client_config::ClientConfig;

pub struct StatechainCoinDetails {
    pub client_seckey: SecretKey,
    pub client_pubkey: PublicKey,
    pub amount: u64,
    pub server_pubkey: PublicKey,
    pub aggregated_pubkey: PublicKey,
    pub p2tr_agg_address: Address,
    pub auth_seckey: SecretKey,
}

impl ClientConfig {

    pub async fn get_backup_transactions(&self, statechain_id: &str) -> Vec::<mercury_lib::transfer::SenderBackupTransaction> {

        let rows = sqlx::query("SELECT * FROM backup_transaction WHERE statechain_id = $1")
            .bind(statechain_id)
            .fetch_all(&self.pool)
            .await
            .unwrap();
    
        let mut backup_transactions = Vec::<mercury_lib::transfer::SenderBackupTransaction>::new();
    
        for row in rows {
            let row_statechain_id = row.get::<String, _>("statechain_id");
            assert!(row_statechain_id == statechain_id);
            
            let tx_n = row.get::<u32, _>("tx_n");
    
            let client_public_nonce = row.get::<Vec<u8>, _>("client_public_nonce");
    
            let server_public_nonce = row.get::<Vec<u8>, _>("server_public_nonce");
    
            let client_public_key_bytes = row.get::<Vec<u8>, _>("client_pubkey");
            let client_public_key = PublicKey::from_slice(&client_public_key_bytes).unwrap();
    
            let server_public_key_bytes = row.get::<Vec<u8>, _>("server_pubkey");
            let server_public_key = PublicKey::from_slice(&server_public_key_bytes).unwrap();
    
            let blinding_factor = row.get::<Vec<u8>, _>("blinding_factor");
    
            let tx_bytes = row.get::<Vec<u8>, _>("backup_tx");
            let tx = bitcoin::consensus::deserialize::<Transaction>(&tx_bytes).unwrap();
    
            let recipient_address = row.get::<String, _>("recipient_address");
    
            backup_transactions.push(mercury_lib::transfer::SenderBackupTransaction {
                statechain_id: row_statechain_id,
                tx_n,
                tx,
                client_public_nonce,
                server_public_nonce,
                client_public_key,
                server_public_key,
                blinding_factor,
                recipient_address,
            });
        }
    
        backup_transactions
    }

    pub async fn get_statechain_coin_details(&self,statechain_id: &str) -> StatechainCoinDetails {

        let query = "\
                SELECT sid.client_seckey_share, sid.client_pubkey_share, std.amount, std.server_pubkey_share, std.aggregated_pubkey, std.p2tr_agg_address, sid.auth_seckey \
                FROM signer_data sid INNER JOIN statechain_data std \
                ON sid.client_pubkey_share = std.client_pubkey_share \
                WHERE std.statechain_id = $1";
    
        let row = sqlx::query(query)
            .bind(statechain_id)
            .fetch_one(&self.pool)
            .await
            .unwrap();
    
        let secret_key_bytes = row.get::<Vec<u8>, _>("client_seckey_share");
        let client_seckey = SecretKey::from_slice(&secret_key_bytes).unwrap();
    
        let client_public_key_bytes = row.get::<Vec<u8>, _>("client_pubkey_share");
        let client_pubkey = PublicKey::from_slice(&client_public_key_bytes).unwrap();
    
        let amount = row.get::<i64, _>("amount") as u64;
    
        let server_public_key_bytes = row.get::<Vec<u8>, _>("server_pubkey_share");
        let server_pubkey = PublicKey::from_slice(&server_public_key_bytes).unwrap();
    
        let agg_public_key_bytes = row.get::<Vec<u8>, _>("aggregated_pubkey");
        let aggregated_pubkey = PublicKey::from_slice(&agg_public_key_bytes).unwrap();
    
        let agg_address_str = row.get::<String, _>("p2tr_agg_address");
        let p2tr_agg_address = Address::from_str(&agg_address_str).unwrap().require_network(self.network).unwrap();
    
        let auth_seckey_bytes = row.get::<Vec<u8>, _>("auth_seckey");
        let auth_seckey = SecretKey::from_slice(&auth_seckey_bytes).unwrap();
    
        let aggregated_xonly_pubkey = aggregated_pubkey.x_only_public_key().0;
        let address = Address::p2tr(&Secp256k1::new(), aggregated_xonly_pubkey, None, self.network);
    
        assert!(address.to_string() == p2tr_agg_address.to_string());
    
        StatechainCoinDetails {
            client_seckey,
            client_pubkey,
            amount,
            server_pubkey,
            aggregated_pubkey,
            p2tr_agg_address,
            auth_seckey,
        }
    
    }
}