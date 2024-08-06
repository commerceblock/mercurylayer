use chrono::{DateTime, Utc};
use secp256k1_zkp::XOnlyPublicKey;
use sqlx::Row;

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

pub async fn is_lightning_latch(pool: &sqlx::PgPool, statechain_id: &str, sender_auth_key: &XOnlyPublicKey, batch_id: &str) -> bool {
    let query = "SELECT EXISTS \
        (SELECT 1 FROM \
        lightning_latch \
        WHERE statechain_id = $1 \
        AND sender_auth_xonly_public_key = $2 \
        AND batch_id = $3)";

    let row = sqlx::query(query)
        .bind(statechain_id)
        .bind(sender_auth_key.serialize())
        .bind(batch_id)
        .fetch_one(pool)
        .await
        .unwrap();

    let exists: bool = row.get(0);

    exists
}

pub async fn get_preimage(pool: &sqlx::PgPool, statechain_id: &str, sender_auth_key: &XOnlyPublicKey, batch_id: &str) -> Option<String> {

    let query = "SELECT pre_image FROM \
        lightning_latch \
        WHERE statechain_id = $1 \
        AND sender_auth_xonly_public_key = $2 \
        AND batch_id = $3";

    let row = sqlx::query(query)
        .bind(statechain_id)
        .bind(sender_auth_key.serialize())
        .bind(batch_id)
        .fetch_optional(pool)
        .await
        .unwrap();

    if row.is_none()
    {
        return None;
    }

    let row = row.unwrap();

    let pre_image: String = row.get(0);

    Some(pre_image)

}

pub async fn get_preimage_by_batch_id(pool: &sqlx::PgPool, batch_id: &str) -> Option<String> {

    let query = "SELECT pre_image FROM \
        lightning_latch \
        WHERE batch_id = $1";

    let row = sqlx::query(query)
        .bind(batch_id)
        .fetch_optional(pool)
        .await
        .unwrap();

    if row.is_none()
    {
        return None;
    }

    let row = row.unwrap();

    let pre_image: String = row.get(0);

    Some(pre_image)
}
