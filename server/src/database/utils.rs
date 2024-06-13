use sqlx::Row;

pub async fn get_enclave_index_from_database(pool: &sqlx::PgPool, statechain_id: &str) -> Option<i32> {

    let query = "SELECT enclave_index \
        FROM statechain_data \
        WHERE statechain_id = $1";

    let row = sqlx::query(query)
        .bind(statechain_id)
        .fetch_optional(pool)
        .await
        .unwrap();

    if row.is_none() {
        return None;
    }

    let row = row.unwrap();

    let enclave_index: i32 = row.get("enclave_index");

    Some(enclave_index)
}
