use sqlx::Sqlite;

use crate::error::CError;

mod db;

async fn get_msg_addr(auth_pubkey: secp256k1_zkp::PublicKey) -> Result<String, CError> {
    let endpoint = "http://127.0.0.1:8000";
    let path = format!("transfer/transfer/get_msg_addr/{}", auth_pubkey.to_string());

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.get(&format!("{}/{}", endpoint, path));

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.get(&format!("{}/{}", endpoint, path));

    let value = match request.send().await {
        Ok(response) => {
            let text = response.text().await.unwrap();
            text
        },
        Err(err) => {
            return Err(CError::Generic(err.to_string()));
        },
    };

    println!("value: {}", value);

    Ok("".to_string())
}

pub async fn receive(pool: &sqlx::Pool<Sqlite>,) {

    let auth_pubkeys = db::get_all_auth_pubkey(pool).await;

    for auth_pubkey in auth_pubkeys {
        let msg_addr = get_msg_addr(auth_pubkey).await;
        println!("msg_addr: {}", msg_addr);
    }

    let endpoint = "http://127.0.0.1:8000";
    let path = "transfer/transfer/get_msg_addr";
}