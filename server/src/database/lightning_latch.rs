use chrono::{DateTime, Utc};
use secp256k1_zkp::XOnlyPublicKey;

pub async fn insert_paymenthash(
    pool: &sqlx::PgPool, 
    statechain_id: &str, 
    sender_auth_key: &XOnlyPublicKey,
    batch_id: &str,
    pre_image: &str,
    expires_at: &DateTime<Utc>)  
{
    let query = "DELETE FROM lightning_latch WHERE expires_at < now()";

    let _ = sqlx::query(query)
        .execute(pool)
        .await
        .unwrap();

    let query = "INSERT INTO lightning_latch (statechain_id, sender_auth_xonly_public_key, batch_id, pre_image, expires_at) VALUES ($1, $2, $3, $4, $5)";

    let _ = sqlx::query(query)
        .bind(statechain_id)
        .bind(sender_auth_key.serialize())
        .bind(batch_id)
        .bind(pre_image)
        .bind(expires_at)
        .execute(pool)
        .await
        .unwrap();
}
