use anyhow::Result;
use electrum_client::ElectrumApi;
use mercury_lib::wallet::{Wallet, generate_mnemonic};

use crate::{utils::info_config, client_config::ClientConfig};

pub async fn create_wallet(
    name: &str, 
    client_config: &ClientConfig
) -> Result<Wallet> {
    let mnemonic = generate_mnemonic()?;

    let server_info = info_config(&client_config).await?;

    let block_header = client_config.electrum_client.block_headers_subscribe_raw()?;
    let blockheight = block_header.height as u32;

    let wallet = Wallet {
        name: name.to_string(),
        mnemonic,
        version: String::from("0.1.0"),
        state_entity_endpoint: client_config.statechain_entity.to_string(),
        electrum_endpoint: client_config.electrum_server_url.to_string(),
        network: client_config.network.to_string(),
        blockheight,
        initlock: server_info.initlock,
        interval: server_info.interval,
        tokens: Vec::new(),
        activities: Vec::new(),
        coins: Vec::new()
    };

    // save wallet to database

    Ok(wallet)
}