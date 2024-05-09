use rocket::{State, serde::json::Json, response::status, http::Status};
use serde_json::{json, Value};

use crate::server::StateChainEntity;

async fn delete_statechain_db(pool: &sqlx::PgPool,  statechain_id: &String)  {

    let mut transaction = pool.begin().await.unwrap();

    let _ = sqlx::query("DELETE FROM statechain_transfer WHERE statechain_id = $1")
        .bind(statechain_id)
        .execute(&mut *transaction)
        .await
        .unwrap();

    let _ = sqlx::query("DELETE FROM statechain_data WHERE statechain_id = $1")
        .bind(statechain_id)
        .execute(&mut *transaction)
        .await
        .unwrap();

    let _ = sqlx::query("DELETE FROM statechain_signature_data WHERE statechain_id = $1")
        .bind(statechain_id)
        .execute(&mut *transaction)
        .await
        .unwrap();

    transaction.commit().await.unwrap();
}

#[delete("/withdraw/complete", format = "json", data = "<delete_statechain_payload>")]
pub async fn withdraw_complete(statechain_entity: &State<StateChainEntity>, delete_statechain_payload: Json<mercurylib::withdraw::WithdrawCompletePayload>) -> status::Custom<Json<Value>>  {

    let statechain_id = delete_statechain_payload.0.statechain_id.clone();
    let signed_statechain_id = delete_statechain_payload.0.signed_statechain_id.clone();

    if !crate::endpoints::utils::validate_signature(&statechain_entity.pool, &signed_statechain_id, &statechain_id).await {

        let response_body = json!({
            "message": "Signature does not match authentication key."
        });
    
        return status::Custom(Status::InternalServerError, Json(response_body));
    }

    let lockbox_endpoint = statechain_entity.config.lockbox.clone().unwrap();
    let path = "delete_statechain";

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.delete(&format!("{}/{}/{}", lockbox_endpoint, path, statechain_id));

    let response = request.send().await;

    if response.is_err() {

        let response_body = json!({
            "error": "Internal Server Error",
            "message": response.err().unwrap().to_string()
        });

        return status::Custom(Status::InternalServerError, Json(response_body));
    };

    delete_statechain_db(&statechain_entity.pool, &statechain_id).await;

    let response_body = json!({
        "message": "Statechain deleted.",
    });

    return status::Custom(Status::Ok, Json(response_body));

}