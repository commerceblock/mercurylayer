use bitcoin::Address;
use secp256k1_zkp::PublicKey;
use sqlx::Row;

use crate::{client_config::ClientConfig, electrum, key_derivation::KeyData};

impl ClientConfig {

    pub async fn generate_or_get_seed(&self) -> ([u8; 32], u32) {

        let rows = sqlx::query("SELECT * FROM signer_seed")
            .fetch_all(&self.pool)
            .await
            .unwrap();
    
        if rows.len() > 1 {
            panic!("More than one seed in database");
        }
    
        if rows.len() == 1 {
            let row = rows.get(0).unwrap();
            let seed = row.get::<Vec<u8>, _>("seed");
            let block_height = row.get::<u32, _>("blockheight");
            let mut seed_array = [0u8; 32];
            seed_array.copy_from_slice(&seed);
            return (seed_array, block_height);
        } else {
            let mut seed = [0u8; 32];  // 256 bits
            rand::RngCore::fill_bytes(&mut rand::thread_rng(), &mut seed);
    
            // TODO: Now that this function gets the block height, it is better to split this function into two
            // One for generating the seed and one for getting the seed
            let block_header = electrum::block_headers_subscribe_raw(&self.electrum_client);
            let block_height = block_header.height;
            
            let query = "INSERT INTO signer_seed (seed, blockheight) VALUES ($1, $2)";
            let _ = sqlx::query(query)
                .bind(seed.to_vec())
                .bind(block_height as u32)
                .execute(&self.pool)
                .await
                .unwrap();
    
            (seed, block_height as u32)
        }   
    }

    pub async fn get_next_address_index(&self, change_index: u32) -> u32 {

        let row = sqlx::query("SELECT MAX(address_index) FROM signer_data WHERE change_index = $1")
            .bind(change_index)
            .fetch_one(&self.pool)
            .await
            .unwrap();
    
        let index = row.get::<Option<u32>, _>(0);
    
        if index.is_some() {
            return index.unwrap() + 1;
        } else {
            return 0;
        }
    }

    pub async fn insert_agg_key_data(&self, key_data: &KeyData, backup_address: &Address)  {

        let query = 
            "INSERT INTO signer_data (client_seckey_share, client_pubkey_share, backup_address, fingerprint, client_derivation_path, change_index, address_index) \
            VALUES ($1, $2, $3, $4, $5, $6, $7)";
    
        let _ = sqlx::query(query)
            .bind(&key_data.secret_key.secret_bytes().to_vec())
            .bind(&key_data.public_key.serialize().to_vec())
            .bind(&backup_address.to_string())
            .bind(&key_data.fingerprint)
            .bind(&key_data.derivation_path)
            .bind(key_data.change_index)
            .bind(key_data.address_index)
            .execute(&self.pool)
            .await
            .unwrap();
    }

    pub async fn update_auth_key_data(&self, key_data: &KeyData, client_pubkey_share: &PublicKey, transfer_address: &str)  {

        let query = "\
            UPDATE signer_data \
            SET auth_derivation_path = $1, auth_seckey = $2, auth_pubkey = $3, transfer_address = $4 \
            WHERE client_pubkey_share = $5";
    
        let _ = sqlx::query(query)
            .bind(&key_data.derivation_path)
            .bind(&key_data.secret_key.secret_bytes().to_vec())
            .bind(&key_data.public_key.serialize().to_vec())
            .bind(transfer_address)
            .bind(&client_pubkey_share.serialize().to_vec())
            .execute(&self.pool)
            .await
            .unwrap();
    }
}