use chrono::{DateTime, Utc};
use secp256k1_zkp::PublicKey;

use sqlx::Row;

pub async fn exists_msg_for_same_statechain_id_and_new_user_auth_key(pool: &sqlx::PgPool, new_user_auth_key: &PublicKey, statechain_id: &str, batch_id: &Option<String>) -> bool {

    let mut query = "\
        SELECT COUNT(*) \
        FROM statechain_transfer \
        WHERE new_user_auth_public_key = $1 \
        AND statechain_id = $2".to_string();

    if batch_id.is_some() {
        query = format!("{} AND batch_id = $3", query);
    }

    let serialized_new_user_auth_key = new_user_auth_key.serialize();

    let mut ps_query = sqlx::query(&query)
        .bind(&serialized_new_user_auth_key)
        .bind(statechain_id);

    if batch_id.is_some() {
        ps_query = ps_query.bind(batch_id.clone().unwrap());
    }

    let row =   ps_query  
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

pub async fn is_lightning_latch(pool: &sqlx::PgPool, statechain_id: &str) -> bool {

    let query = "\
        SELECT 1 \
        FROM statechain_transfer \
        WHERE statechain_id = $1 \
        AND locked = true \
        AND locked2 = true \
        AND pre_image IS NOT NULL \
        AND encrypted_transfer_msg IS NULL \
        AND x1 IS NULL \
        AND new_user_auth_public_key IS NULL";

    let row = sqlx::query(query)
        .bind(statechain_id)
        .fetch_optional(pool)
        .await
        .unwrap();

    row.is_some()
}

pub async fn insert_paymenthash(
    pool: &sqlx::PgPool, 
    statechain_id: &str, 
    batch_id: &str,
    pre_image: &str)  
{
    let mut transaction = pool.begin().await.unwrap();

    let query1 = "DELETE FROM statechain_transfer WHERE statechain_id = $1";

    let _ = sqlx::query(query1)
        .bind(statechain_id)
        .execute(&mut *transaction)
        .await
        .unwrap();

    let query2 = "INSERT INTO statechain_transfer (statechain_id, batch_id, batch_time, locked, locked2, pre_image) VALUES ($1, $2, $3, $4, $5, $6)";

    let batch_time = Some(Utc::now());

    let _ = sqlx::query(query2)
        .bind(statechain_id)
        .bind(batch_id)
        .bind(batch_time)
        .bind(true)
        .bind(true)
        .bind(pre_image)
        .execute(&mut *transaction)
        .await
        .unwrap();

    transaction.commit().await.unwrap();


}

pub async fn insert_new_transfer(
    pool: &sqlx::PgPool, 
    new_user_auth_key: &PublicKey, 
    x1: &[u8; 32], 
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
        "INSERT INTO statechain_transfer (statechain_id, new_user_auth_public_key, x1, locked) VALUES ($1, $2, $3, $4)"
    } else {
        "INSERT INTO statechain_transfer (statechain_id, new_user_auth_public_key, x1, batch_id, batch_time, locked) VALUES ($1, $2, $3, $4, $5, $6)"
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

        ps_query = ps_query
            .bind(batch_id)
            .bind(batch_time.unwrap())
            .bind(true);
    } else {
        ps_query = ps_query.bind(false);
    }

    ps_query.execute(&mut *transaction)
        .await
        .unwrap();    

    transaction.commit().await.unwrap();
}

pub async fn update_lightning_latch_transfer(
    pool: &sqlx::PgPool, 
    new_user_auth_key: &PublicKey, 
    x1: &[u8; 32], 
    statechain_id: &str, 
    batch_id: &str)
{
    let mut transaction = pool.begin().await.unwrap();

    let query = "\
        UPDATE statechain_transfer \
        SET new_user_auth_public_key = $1, x1 = $2, updated_at = NOW() \
        WHERE statechain_id = $3 AND batch_id = $4";

    let ser_new_user_auth_key = new_user_auth_key.serialize();

    let _ = sqlx::query(query)
        .bind(ser_new_user_auth_key)
        .bind(x1)
        .bind(statechain_id)
        .bind(batch_id)
        .execute(&mut *transaction)
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
            new_user_auth_public_key = $3";

    let _ = sqlx::query(query)
        .bind(enc_transfer_msg)
        .bind(statechain_id)
        .bind(&new_user_auth_key.serialize())
        .execute(pool)
        .await
        .unwrap();
}

pub struct GetPreimageResult {
    pub pre_image: String,
    pub locked: bool,
    pub locked2: bool,
}

pub async fn get_preimage(pool: &sqlx::PgPool, statechain_id: &str) -> Option<GetPreimageResult> {

    let query = "\
        SELECT pre_image, locked, locked2 \
        FROM statechain_transfer \
        WHERE statechain_id = $1
        AND locked = true";

    let row = sqlx::query(query)
        .bind(statechain_id)
        .fetch_optional(pool)
        .await
        .unwrap();

    match row {
        Some(row) => {
            let pre_image: String = row.get(0);
            let locked: bool = row.get(1);
            let locked2: bool = row.get(2);
            Some(GetPreimageResult{
                pre_image,
                locked,
                locked2
            })
        }
        None => None
    }
}