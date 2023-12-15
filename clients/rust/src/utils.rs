
use chrono::Utc;
use electrum_client::ElectrumApi;
use mercury_lib::{utils::{ServerConfig, InfoConfig}, wallet::Activity};
use anyhow::{Result, Ok};

pub async fn info_config(statechain_entity_url: &str, electrum_client: &electrum_client::Client) -> Result<InfoConfig>{

    let path = "info/config";

    let client: reqwest::Client = reqwest::Client::new();
    let request = client.get(&format!("{}/{}", statechain_entity_url, path));

    let value = request.send().await?.text().await?;

    let server_config: ServerConfig = serde_json::from_str(value.as_str())?;

    let initlock = server_config.initlock;
    let interval = server_config.interval;

    let number_blocks = 3;
    let mut fee_rate_btc_per_kb = electrum_client.estimate_fee(number_blocks)?;

    // Why does it happen?
    if fee_rate_btc_per_kb <= 0.0 {
        fee_rate_btc_per_kb = 0.00001;
    }

    let fee_rate_sats_per_byte = (fee_rate_btc_per_kb * 100000.0) as u64;

    println!("fee_rate_sats_per_byte: {}", fee_rate_sats_per_byte);

    Ok(InfoConfig {    
        initlock,
        interval,
        fee_rate_sats_per_byte,
    })
}

pub fn create_activity(utxo: &str, amount: u32, action: &str) -> Activity {

    let date = Utc::now(); // This will get the current date and time in UTC
    let iso_string = date.to_rfc3339(); // Converts the date to an ISO 8601 string

    let activity = Activity {
        utxo: utxo.to_string(),
        amount,
        action: action.to_string(),
        date: iso_string
    };

    activity
}
