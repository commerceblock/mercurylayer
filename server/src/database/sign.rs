use sqlx::Row;

pub async fn get_server_pubnonce_from_null_challenge(pool: &sqlx::PgPool, statechain_id: &str) -> Option<String> {

    let query = "SELECT server_pubnonce \
        FROM statechain_signature_data \
        WHERE statechain_id = $1 \
        AND challenge is NULL \
        ORDER BY created_at ASC";

    let row = sqlx::query(query)
        .bind(statechain_id)
        .fetch_optional(pool)
        .await
        .unwrap();

    if row.is_none()
    {
        return None;
    }

    let row = row.unwrap();

    let server_pubnonce: String = row.get(0);

    Some(server_pubnonce)
}

pub async fn insert_new_signature_data(pool: &sqlx::PgPool, server_pubnonce: &str, statechain_id: &str)  {

    let mut transaction = pool.begin().await.unwrap();

    // FOR UPDATE is used to lock the row for the duration of the transaction
    // It is not allowed with aggregate functions (MAX in this case), so we need to wrap it in a subquery
    let max_tx_k_query = "\
        SELECT COALESCE(MAX(tx_n), 0) \
        FROM (\
            SELECT * \
            FROM statechain_signature_data \
            WHERE statechain_id = $1 FOR UPDATE) AS result";

    let row = sqlx::query(max_tx_k_query)
        .bind(statechain_id)
        .fetch_one(&mut *transaction)
        .await
        .unwrap();

    let mut new_tx_n = row.get::<i32, _>(0);
    new_tx_n = new_tx_n + 1;

    let query = "\
        INSERT INTO statechain_signature_data \
        (server_pubnonce, statechain_id, tx_n) \
        VALUES ($1, $2, $3)";

    let _ = sqlx::query(query)
        .bind(server_pubnonce)
        .bind(statechain_id)
        .bind(new_tx_n)
        .execute(&mut *transaction)
        .await
        .unwrap();

    transaction.commit().await.unwrap();
}

pub async fn update_signature_data_challenge(pool: &sqlx::PgPool, server_pub_nonce: &str, challenge: &str, statechain_id: &str)  {

    println!("server_pub_nonce: {}", server_pub_nonce);
    println!("challenge: {}", challenge);
    println!("statechain_id: {}", statechain_id);

    let query = "\
        UPDATE statechain_signature_data \
        SET challenge = $1 \
        WHERE statechain_id = $2 AND server_pubnonce= $3";

    let _ = sqlx::query(query)
        .bind(challenge)
        .bind(statechain_id)
        .bind(server_pub_nonce)
        .execute(pool)
        .await
        .unwrap();
}
