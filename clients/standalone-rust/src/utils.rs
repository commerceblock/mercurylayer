use crate::{error::CError, electrum};

pub struct InfoConfig {
    pub initlock: u32,
    pub interval: u32,
    pub fee_rate_sats_per_byte: u64,
}

pub async fn info_config(statechain_entity_url: &str, electrum_client: &electrum_client::Client) -> Result<InfoConfig, CError>{

    let path = "info/config";

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.get(&format!("{}/{}", statechain_entity_url, path));

    let value = match request.send().await {
        Ok(response) => {
            let text = response.text().await.unwrap();
            text
        },
        Err(err) => {
            return Err(CError::Generic(err.to_string()));
        },
    };

    let server_config: mercury_lib::utils::ServerConfig = serde_json::from_str(value.as_str()).expect(&format!("failed to parse: {}", value.as_str()));

    let initlock = server_config.initlock;
    let interval = server_config.interval;

    let fee_rate_btc_per_kb = electrum::estimate_fee(&electrum_client, 3);
    let fee_rate_sats_per_byte = (fee_rate_btc_per_kb * 100000.0) as u64;

    Ok(InfoConfig {    
        initlock,
        interval,
        fee_rate_sats_per_byte,
    })
}