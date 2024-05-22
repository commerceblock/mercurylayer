use anyhow::Result;
use electrum_client::ElectrumApi;
use mercurylib::wallet::{generate_mnemonic, Settings, Wallet};

use crate::{utils::info_config, client_config::ClientConfig};

pub async fn create_wallet(
    name: &str, 
    client_config: &ClientConfig
) -> Result<Wallet> {
    let mnemonic = generate_mnemonic()?;

    let server_info = info_config(&client_config).await?;

    let block_header = client_config.electrum_client.block_headers_subscribe_raw()?;
    let blockheight = block_header.height as u32;

    let electrum_endpoint = client_config.electrum_server_url.to_string();
    let (electrum_protocol, rest) = electrum_endpoint.split_once("://").expect("Could not find protocol separator");

    let (electrum_host, electrum_port) = rest.rsplit_once(':').expect("Could not find port separator");
    
    let notifications = false;
    let tutorials = false;

    let settings = Settings {
        network: client_config.network.to_string(),
        block_explorerURL: None,
        torProxyHost: None,
        torProxyPort: None,
        torProxyControlPassword: None,
        torProxyControlPort: None,
        statechainEntityApi: client_config.statechain_entity.to_string(),
        torStatechainEntityApi: None,
        electrumProtocol: electrum_protocol.to_string(),
        electrumHost: electrum_host.to_string(),
        electrumPort: electrum_port.to_string(),
        electrumType: client_config.electrum_type.to_string(),
        notifications,
        tutorials,
    };

    let wallet = Wallet {
        name: name.to_string(),
        mnemonic,
        version: String::from("0.1.0"),
        state_entity_endpoint: client_config.statechain_entity.to_string(),
        electrum_endpoint,
        network: client_config.network.to_string(),
        blockheight,
        initlock: server_info.initlock,
        interval: server_info.interval,
        tokens: Vec::new(),
        activities: Vec::new(),
        coins: Vec::new(),
        // settings,
    };

    // save wallet to database

    Ok(wallet)
}