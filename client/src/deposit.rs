use std::{str::FromStr, thread, time::Duration};

use bitcoin::{Network, secp256k1, hashes::sha256, Address, TxOut, Txid};
use electrum_client::ListUnspentRes;
use secp256k1_zkp::{Secp256k1, Message, PublicKey, musig::MusigKeyAggCache, SecretKey, XOnlyPublicKey, schnorr::Signature};
use serde::{Serialize, Deserialize};
use sqlx::{Sqlite, Row};

use crate::{key_derivation, error::CError, electrum};

const TX_SIZE: u64 = 112; // virtual size one input P2TR and one output P2TR
// 163 is the real size one input P2TR and one output P2TR

#[derive(Debug, Serialize, Deserialize)]
pub struct DepositRequestPayload {
    amount: u64,
    auth_key: String,
    token_id: String,
    signed_token_id: String,
}

pub async fn execute(pool: &sqlx::Pool<Sqlite>, token_id: uuid::Uuid, amount: u64, network: Network) -> Result<String, CError> {

    let (statechain_id, client_secret_key, client_pubkey_share, to_address, server_pubkey_share, signed_statechain_id) = init(pool, token_id, amount, network).await;
    let (aggregate_pub_key, address) = create_agg_pub_key(pool, &client_pubkey_share, &server_pubkey_share, network).await?;

    let client = electrum_client::Client::new("tcp://127.0.0.1:50001").unwrap();

    println!("address: {}", address.to_string());

    println!("waiting for deposit ....");

    let delay = Duration::from_secs(5);

    let mut utxo: Option<ListUnspentRes> = None;

    loop {
        let utxo_list = electrum::get_script_list_unspent(&client, &address);

        for unspent in utxo_list {
            if unspent.value == amount {
                utxo = Some(unspent);
                break;
            }
        }

        if utxo.is_some() {
            break;
        }

        thread::sleep(delay);
    }

    let utxo = utxo.unwrap();

    update_funding_tx_outpoint(pool, &utxo.tx_hash, utxo.tx_pos as u32, &statechain_id).await;

    let fee_rate_btc_per_kb = electrum::estimate_fee(&client, 3);
    let fee_rate_sats_per_byte = (fee_rate_btc_per_kb * 100000.0) as u64;

    let absolute_fee: u64 = TX_SIZE * fee_rate_sats_per_byte; 
    let amount_out = utxo.value - absolute_fee;

    let tx_out = TxOut { value: amount_out, script_pubkey: to_address.script_pubkey() };

    let block_header = electrum::block_headers_subscribe_raw(&client);
    let mut block_height = block_header.height;

    block_height = block_height + 12000;

    crate::transaction::new(pool, &statechain_id,).await.unwrap();

    let (tx, client_pub_nonce, blinding_factor) = crate::transaction::create(
        block_height as u32,
        &statechain_id,
        &signed_statechain_id,
        &client_secret_key,
        &client_pubkey_share,
        &server_pubkey_share,
        utxo.tx_hash, 
        utxo.tx_pos as u32, 
        &aggregate_pub_key, 
        &address.script_pubkey(), 
        utxo.value, 
        tx_out).await.unwrap();

    let tx_bytes = bitcoin::consensus::encode::serialize(&tx);

    crate::transaction::insert_transaction(pool, &tx_bytes, &client_pub_nonce.serialize(), blinding_factor.as_bytes(), &statechain_id).await;

    Ok(statechain_id)

}

pub async fn init(pool: &sqlx::Pool<Sqlite>, token_id: uuid::Uuid, amount: u64, network: Network) -> (String, SecretKey, PublicKey, Address, PublicKey, Signature) {

    let address_data = key_derivation::get_new_address(pool, Some(token_id), Some(amount), network).await;

    let msg = Message::from_hashed_data::<sha256::Hash>(token_id.to_string().as_bytes());

    let secp = Secp256k1::new();
    let auth_secret_key = address_data.auth_secret_key;
    let keypair = secp256k1::KeyPair::from_seckey_slice(&secp, auth_secret_key.as_ref()).unwrap();
    let signed_token_id = secp.sign_schnorr(&msg, &keypair);
    
    let deposit_request_payload = DepositRequestPayload {
        amount,
        auth_key: address_data.auth_xonly_pubkey.to_string(),
        token_id: token_id.to_string(),
        signed_token_id: signed_token_id.to_string(),
    };

    let endpoint = "http://127.0.0.1:8000";
    let path = "deposit/init/pod";

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.post(&format!("{}/{}", endpoint, path));

    let value = match request.json(&deposit_request_payload).send().await {
        Ok(response) => {
            let text = response.text().await.unwrap();
            text
        },
        Err(err) => {
            // return Err(CError::Generic(err.to_string()));
            panic!("error: {}", err);
        },
    };

    #[derive(Serialize, Deserialize)]
    pub struct PublicNonceRequestPayload<'r> {
        server_pubkey: &'r str,
        statechain_id: &'r str,
    }

    let response: PublicNonceRequestPayload = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));

    let server_pubkey_share = PublicKey::from_str(&response.server_pubkey).unwrap();

    let statechain_id = response.statechain_id.to_string();

    update_statechain_id(pool, statechain_id.clone(), &address_data.client_pubkey_share).await;

    let msg = Message::from_hashed_data::<sha256::Hash>(statechain_id.to_string().as_bytes());
    let signed_statechain_id = secp.sign_schnorr(&msg, &keypair);

    (statechain_id, address_data.client_secret_key, address_data.client_pubkey_share, address_data.backup_address, server_pubkey_share, signed_statechain_id)
}

pub async fn update_statechain_id(pool: &sqlx::Pool<Sqlite>, statechain_id: String, client_pubkey: &PublicKey) {
    let query = "\
        UPDATE signer_data \
        SET statechain_id = $1 \
        WHERE client_pubkey_share = $2";

    let _ = sqlx::query(query)
        .bind(&statechain_id)
        .bind(&client_pubkey.serialize().to_vec())
        .execute(pool)
        .await
        .unwrap();
}

pub async fn create_agg_pub_key(pool: &sqlx::Pool<Sqlite>, client_pubkey: &PublicKey, server_pubkey: &PublicKey, network: Network) -> Result<(XOnlyPublicKey, Address), CError> {

    let secp = Secp256k1::new();

    let key_agg_cache = MusigKeyAggCache::new(&secp, &[client_pubkey.to_owned(), server_pubkey.to_owned()]);
    let agg_pk = key_agg_cache.agg_pk();

    let address = Address::p2tr(&Secp256k1::new(), agg_pk, None, network);

    let query = "\
        UPDATE signer_data \
        SET server_pubkey_share= $1, aggregated_pubkey = $2, p2tr_agg_address = $3 \
        WHERE client_pubkey_share = $4";

    let _ = sqlx::query(query)
        .bind(&server_pubkey.serialize().to_vec())
        .bind(&agg_pk.serialize().to_vec())
        .bind(&address.to_string())
        .bind(&client_pubkey.serialize().to_vec())
        .execute(pool)
        .await
        .unwrap();

    Ok((agg_pk,address))

}


 async fn update_funding_tx_outpoint(pool: &sqlx::Pool<Sqlite>, txid: &Txid, vout: u32, statechain_id: &str) {

    let query = "\
        UPDATE signer_data \
        SET funding_txid = $1, funding_vout = $2 \
        WHERE statechain_id = $3";

    let _ = sqlx::query(query)
        .bind(&txid.to_string())
        .bind(vout)
        .bind(statechain_id)
        .execute(pool)
        .await
        .unwrap();
 }

pub async fn broadcast_backup_tx(pool: &sqlx::Pool<Sqlite>, statechain_id: &str) -> Txid {
    
    let query = "\
        SELECT backup_tx \
        FROM backup_transaction \
        WHERE tx_n = (SELECT MAX(tx_n) FROM backup_transaction WHERE statechain_id = $1)
        AND statechain_id = $1";

    let row = sqlx::query(query)
        .bind(statechain_id)
        .fetch_one(pool)
        .await
        .unwrap();

    let tx_bytes = row.get::<Vec<u8>, _>("backup_tx");

    let client = electrum_client::Client::new("tcp://127.0.0.1:50001").unwrap();
    
    let txid = electrum::transaction_broadcast_raw(&client, &tx_bytes);

    txid
}