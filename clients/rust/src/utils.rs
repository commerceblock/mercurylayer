
use chrono::Utc;
use electrum_client::ElectrumApi;
use mercurylib::{transfer::receiver::StatechainInfoResponsePayload, utils::{InfoConfig, ServerConfig}, wallet::Activity};
use anyhow::{anyhow, Result, Ok};
use crate::client_config::ClientConfig;

pub async fn info_config(client_config: &ClientConfig) -> Result<InfoConfig>{

    let path = "info/config";

    let client = client_config.get_reqwest_client()?;
    let request = client.get(&format!("{}/{}", client_config.statechain_entity, path));

    let value = request.send().await?.text().await?;

    let server_config: ServerConfig = serde_json::from_str(value.as_str())?;

    let initlock = server_config.initlock;
    let interval = server_config.interval;

    let number_blocks = 3;
    let mut fee_rate_btc_per_kb = client_config.electrum_client.estimate_fee(number_blocks)?;

    // Why does it happen?
    if fee_rate_btc_per_kb <= 0.0 {
        fee_rate_btc_per_kb = 0.00001;
    }

    let fee_rate_sats_per_byte = (fee_rate_btc_per_kb * 100000.0) as u64;

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

pub async fn get_statechain_info(statechain_id: &str, client_config: &ClientConfig) -> Result<StatechainInfoResponsePayload> {

    let path = format!("info/statechain/{}", statechain_id.to_string());

    let client = client_config.get_reqwest_client()?;
    let request = client.get(&format!("{}/{}", client_config.statechain_entity, path));

    let value = match request.send().await {
        std::result::Result::Ok(response) => {
            let text = response.text().await.unwrap();
            text
        },
        Err(err) => {
            return Err(anyhow!(err.to_string()));
        },
    };

    let response: StatechainInfoResponsePayload = serde_json::from_str(value.as_str())?;

    Ok(response)
}
