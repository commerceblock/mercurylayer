use chrono::{DateTime, Utc};
use secp256k1_zkp::PublicKey;

use sqlx::Row;

pub async fn exists_msg_for_same_statechain_id_and_new_user_auth_key(pool: &sqlx::PgPool, new_user_auth_key: &PublicKey, statechain_id: &str, batch_id: &Option<String>) -> bool {

    let query = "\
        SELECT COUNT(*) \
        FROM statechain_transfer \
        WHERE new_user_auth_public_key = $1 \
        AND statechain_id = $2 AND batch_id = $3".to_string();

    let serialized_new_user_auth_key = new_user_auth_key.serialize();

    let row = sqlx::query(&query)
        .bind(&serialized_new_user_auth_key)
        .bind(statechain_id)
        .bind(batch_id)
        .fetch_one(pool)
        .await
        .unwrap();

    let count: i64 = row.get(0);

    count > 0
}

pub async fn get_batch_time_by_batch_id(pool: &sqlx::PgPool, batch_id: &str) -> Option<DateTime<Utc>> {

    let query = "\
        SELECT batch_time \
        FROM statechain_transfer \
        WHERE batch_id = $1
        AND locked = true";

    let row = sqlx::query(query)
        .bind(batch_id)
        .fetch_optional(pool)
        .await
        .unwrap();

    match row {
        Some(row) => {
            let batch_time: DateTime<Utc> = row.get(0);
            Some(batch_time)
        }
        None => None
    }
}


pub async fn insert_new_transfer(
    pool: &sqlx::PgPool, 
    new_user_auth_key: &PublicKey, x1: &[u8; 32], 
    statechain_id: &String, 
    batch_id: &Option<String>)  
{

    let mut transaction = pool.begin().await.unwrap();

    let query1 = "DELETE FROM statechain_transfer WHERE statechain_id = $1";

    let _ = sqlx::query(query1)
        .bind(statechain_id)
        .execute(&mut *transaction)
        .await
        .unwrap();

    let query2 = if batch_id.is_none() {
        "INSERT INTO statechain_transfer (statechain_id, new_user_auth_public_key, x1, locked, locked2) VALUES ($1, $2, $3, $4, $5)"
    } else {
        "INSERT INTO statechain_transfer (statechain_id, new_user_auth_public_key, x1, batch_id, batch_time, locked, locked2) VALUES ($1, $2, $3, $4, $5, $6, $7)"
    };

    let ser_new_user_auth_key = new_user_auth_key.serialize();

    let mut ps_query = sqlx::query(query2)
        .bind(statechain_id)
        .bind(ser_new_user_auth_key)
        .bind(x1);

    if batch_id.is_some() {

        let batch_id = batch_id.clone().unwrap();

        let mut batch_time = get_batch_time_by_batch_id(pool, &batch_id).await;// Utc::now();

        if batch_time.is_none() {
            batch_time = Some(Utc::now());
        }

        let sender_auth_key = crate::endpoints::utils::get_auth_key_by_statechain_id(&pool, &statechain_id).await.unwrap();
        let is_lightning_latch = crate::database::lightning_latch::is_lightning_latch(pool, statechain_id, &sender_auth_key, &batch_id).await;

        ps_query = ps_query
            .bind(batch_id)
            .bind(batch_time.unwrap())
            .bind(true)
            .bind(is_lightning_latch);
    } else {
        ps_query = ps_query
            .bind(false)
            .bind(false);
    }

    ps_query.execute(&mut *transaction)
        .await
        .unwrap();    

    transaction.commit().await.unwrap();
}

pub async fn update_transfer_msg(pool: &sqlx::PgPool, new_user_auth_key: &PublicKey, enc_transfer_msg: &Vec<u8>, statechain_id: &str)  {

    let query = "\
        UPDATE statechain_transfer \
        SET encrypted_transfer_msg = $1, updated_at = NOW() \
        WHERE \
            statechain_id = $2 AND \
            new_user_auth_public_key = $3 AND \
            updated_at = (SELECT MAX(updated_at) FROM statechain_transfer WHERE statechain_id = $2)";

    let _ = sqlx::query(query)
        .bind(enc_transfer_msg)
        .bind(statechain_id)
        .bind(&new_user_auth_key.serialize())
        .execute(pool)
        .await
        .unwrap();
}