use secp256k1_zkp::PublicKey;
use sqlx::{Sqlite, Row};

pub async fn get_all_auth_pubkey(pool: &sqlx::Pool<Sqlite>,) -> Vec::<PublicKey>{
    let rows = sqlx::query("SELECT auth_pubkey FROM signer_data")
        .fetch_all(pool)
        .await
        .unwrap();

    let mut auth_pubkeys = Vec::<PublicKey>::new();

    for row in rows {
        let auth_pubkey_bytes = row.get::<Vec<u8>, _>("auth_pubkey");
        let auth_pubkey = PublicKey::from_slice(&auth_pubkey_bytes).unwrap();
        auth_pubkeys.push(auth_pubkey);
    }

    auth_pubkeys
} 