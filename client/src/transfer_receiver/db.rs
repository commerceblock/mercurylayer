use secp256k1_zkp::{PublicKey, SecretKey};
use sqlx::{Sqlite, Row};

pub async fn get_all_auth_pubkey(pool: &sqlx::Pool<Sqlite>,) -> Vec::<(SecretKey, PublicKey, SecretKey, PublicKey)>{
    let rows = sqlx::query("SELECT auth_seckey, auth_pubkey, client_seckey_share, client_pubkey_share FROM signer_data")
        .fetch_all(pool)
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
