use anyhow::Result;
use bitcoin::Network;
use electrum_client::ElectrumApi;
use mercury_lib::wallet::{Wallet, generate_mnemonic};

use crate::utils::info_config;

pub async fn create_wallet(
    name: &str, 
    electrum_client: &electrum_client::Client,
    electrum_endpoint: &str,
    statechain_entity_endpoint: &str,
    network: Network
) -> Result<Wallet> {
    let mnemonic = generate_mnemonic()?;

    let server_info = info_config(statechain_entity_endpoint, &electrum_client).await?;

    let block_header = electrum_client.block_headers_subscribe_raw()?;
    let blockheight = block_header.height as u32;

    let wallet = Wallet {
        name: name.to_string(),
        mnemonic,
        version: String::from("0.1.0"),
        state_entity_endpoint: statechain_entity_endpoint.to_string(),
        electrum_endpoint: electrum_endpoint.to_string(),
        network: network.to_string(),
        blockheight,
        initlock: server_info.initlock,
        interval: server_info.interval,
        tokens: Vec::new(),
        activity: Vec::new(),
        coins: Vec::new()
    };

    // save wallet to database

    Ok(wallet)
}