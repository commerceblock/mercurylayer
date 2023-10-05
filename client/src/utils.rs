use crate::{error::CError, electrum};

pub struct InfoConfig {
    pub initlock: u32,
    pub interval: u32,
    pub fee_rate_sats_per_byte: u64,
}

pub async fn info_config() -> Result<InfoConfig, CError>{
    let endpoint = "http://127.0.0.1:8000";
    let path = "info/config";

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

    let value: serde_json::Value = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));

    let initlock = value.get("initlock").unwrap().as_u64().unwrap() as u32;
    let interval = value.get("interval").unwrap().as_u64().unwrap() as u32;

    let client = electrum_client::Client::new("tcp://127.0.0.1:50001").unwrap();

    let fee_rate_btc_per_kb = electrum::estimate_fee(&client, 3);
    let fee_rate_sats_per_byte = (fee_rate_btc_per_kb * 100000.0) as u64;

    Ok(InfoConfig {    
        initlock,
        interval,
        fee_rate_sats_per_byte,
    })
}