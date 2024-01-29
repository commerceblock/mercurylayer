use std::str::FromStr;

use rocket::{serde::json::Json, response::status, State, http::Status};
use serde::{Serialize, Deserialize};
use serde_json::{Value, json};
use sqlx::Row;

use crate::server::TokenServer;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct Invoice{
    pub id: String,
    pub pr: String,
    pub checkoutUrl: String,
    pub onChainAddr: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct ReqInvoice{
    pub title: String,
    pub description: String,
    pub amount: String,
    pub unit: String,
    pub redirectAfterPaid: String,
    pub email: String,
    pub emailLanguage: String,
    pub onChain: bool,
    pub delay: u64,
    pub extra: Extra,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct Extra{
    pub tag: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct RTLInvoice{
    pub id: String,
    pub pr: String,
    pub checkoutUrl: String,
    pub onChainAddr: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct RTLData{
    pub label: String,
    pub bolt11: String,
    pub payment_hash: String,
    pub msatoshi: u64,
    pub amount_msat: String,
    pub status: String,
    pub description: String,
    pub expires_at: u64
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct RTLQuery{
    pub createdAt: u64,
    pub delay: u64,
    pub pr: String,
    pub amount: u64,
    pub btcAmount: String,
    pub unit: String,
    pub isPaid: bool,
    pub updatePrice: bool,
    pub isHodled: bool,
    pub isInit: bool,
    pub isFixedSatPrice: bool,
    pub deleteExpiredInvoice: bool,
    pub isExpired: bool,
    pub paymentMethod: Option<String>,
    pub paidAt: Option<String>,
    pub title: String,
    pub hash: String,
    pub fiatAmount: f64,
    pub fiatUnit: String,
    pub onChainAddr: String,
    pub minConfirmations: u64,
    pub confirmations: u64,
    pub txId: Option<String>,
    pub isPending: bool,
    pub extra: Extra,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct PODInfo {
    pub token_id: String,
    pub fee: String,
    pub lightning_invoice: String,
    pub btc_payment_address: String,
    pub processor_id: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PODStatus {
    pub confirmed: bool,
    pub expiry: u64,
}


#[get("/token/token_init")]
pub async fn token_init(token_server: &State<TokenServer>) -> status::Custom<Json<Value>>  {

    let token_id = uuid::Uuid::new_v4().to_string();   

    let invoice: Invoice = get_lightning_invoice(token_server, token_id.clone()).await;
    let pod_info = PODInfo {
        token_id: token_id.clone(),
        fee: token_server.config.fee.clone(),
        lightning_invoice: invoice.pr.clone(),
        btc_payment_address: invoice.onChainAddr.clone(),
        processor_id: invoice.id.clone(),
    };

    insert_new_token(&token_server.pool, &token_id, &invoice.pr.clone(), &invoice.onChainAddr, &invoice.id).await;

    let response_body = json!(pod_info);

    return status::Custom(Status::Ok, Json(response_body));
}

#[get("/token/token_verify/<token_id>")]
pub async fn token_verify(token_server: &State<TokenServer>, token_id: String) -> status::Custom<Json<Value>> {

    let row = sqlx::query(
        "SELECT processor_id, confirmed, spent \
        FROM public.tokens \
        WHERE token_id = $1")
        .bind(&token_id)
        .fetch_one(&token_server.pool)
        .await;

    let row = row.unwrap();

    let processor_id: String = row.get(0);
    let confirmed: bool = row.get(1);
    let spent: bool = row.get(2);

    if spent {
        let pod_status = PODStatus {
            confirmed: false,
            expiry: 0 as u64,
        };
        let response_body = json!(pod_status);
        return status::Custom(Status::Ok, Json(response_body));            
    }

    if confirmed {
        let pod_status = PODStatus {
            confirmed: true,
            expiry: 0 as u64,
        };
        let response_body = json!(pod_status);
        return status::Custom(Status::Ok, Json(response_body));            
    } else {
        let expiry = query_lightning_payment(token_server, &processor_id).await;
        if expiry == 0 {
            set_token_confirmed(&token_server.pool, &token_id).await;
            let pod_status = PODStatus {
                confirmed: true,
                expiry: expiry,
            };
            let response_body = json!(pod_status);
            return status::Custom(Status::Ok, Json(response_body));  
        } else {
            let pod_status = PODStatus {
                confirmed: false,
                expiry: 0 as u64,
            };
            let response_body = json!(pod_status);
            return status::Custom(Status::Ok, Json(response_body));
        }
    }
}

pub async fn insert_new_token(pool: &sqlx::PgPool, token_id: &str, invoice: &str, onchain_address: &str, processor_id: &str)  {

    let query = "INSERT INTO tokens (token_id, invoice, onchain_address, processor_id, confirmed, spent) VALUES ($1, $2, $3, $4, $5, $6)";

    let _ = sqlx::query(query)
        .bind(token_id)
        .bind(invoice)
        .bind(onchain_address)
        .bind(processor_id)
        .bind(false)
        .bind(false)
        .execute(pool)
        .await
        .unwrap();
}


pub async fn get_lightning_invoice(token_server: &State<TokenServer>, token_id: String) -> Invoice {

    let processor_url = token_server.config.processor_url.clone();
    let api_key = token_server.config.api_key.clone();
    let path: &str = "checkout";
    let extra: Extra = Extra {
        tag: "invoice-web".to_string(),
    };
    let inv_request: ReqInvoice = ReqInvoice {
        title: token_id.clone().to_string(),
        description: "".to_string(),
        amount: token_server.config.fee.clone(),
        unit: "BTC".to_string(),
        redirectAfterPaid: "".to_string(),
        email: "".to_string(),
        emailLanguage: "en".to_string(),
        onChain: true,
        delay: token_server.config.delay.clone(),
        extra: extra,
    };

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.post(&format!("{}/{}", processor_url, path));
    
    let value = request.header("Api-Key", api_key).header("encodingtype","hex").json(&inv_request).send().await.unwrap().text().await.unwrap(); 

    let ret_invoice: RTLInvoice = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));

    let invoice = Invoice {
        id: ret_invoice.id,
        pr: ret_invoice.pr,
        checkoutUrl: ret_invoice.checkoutUrl,
        onChainAddr: ret_invoice.onChainAddr,
    };
    return invoice;
}

pub async fn query_lightning_payment(token_server: &State<TokenServer>, processor_id: &String) -> u64 {

    let processor_url = token_server.config.processor_url.clone();
    let api_key = token_server.config.api_key.clone();
    let path: String = "checkout/".to_string() + processor_id;

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.get(&format!("{}/{}", processor_url, path));

    let value = request.header("Api-Key", api_key).header("encodingtype","hex").send().await.unwrap().text().await.unwrap();

    let ret_invoice: RTLQuery = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));

    if ret_invoice.isPaid {
        return 0;
    } else {
        return ret_invoice.createdAt + ret_invoice.delay;
    }
}

pub async fn set_token_confirmed(pool: &sqlx::PgPool, token_id: &str)  {

    let mut transaction = pool.begin().await.unwrap();

    let query = "UPDATE tokens \
        SET confirmed = true \
        WHERE token_id = $1";

    let _ = sqlx::query(query)
        .bind(token_id)
        .execute(&mut *transaction)
        .await
        .unwrap();

    transaction.commit().await.unwrap();
}
