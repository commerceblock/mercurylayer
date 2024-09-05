use std::str::FromStr;

use electrum_client::{bitcoin::Address, ElectrumApi, ListUnspentRes};
use mercuryrustlib::client_config::ClientConfig;
use anyhow::{Result, Ok};

pub async fn check_address(client_config: &ClientConfig, address: &str, amount: u32) -> Result<bool> {

    let mut utxo: Option<ListUnspentRes> = None;

    let address = Address::from_str(address)?.require_network(client_config.network)?;

    let utxo_list =  client_config.electrum_client.script_list_unspent(&address.script_pubkey())?;

    for unspent in utxo_list {
        if unspent.value == amount as u64 {
            utxo = Some(unspent);
            break;
        }
    }

    if utxo.is_none() {
        return Ok(false);
    }

    Ok(true)
}

pub async fn get_blockheight(client_config: &ClientConfig) -> Result<usize> {
    let blockheight = client_config.electrum_client.block_headers_subscribe()?.height;
    Ok(blockheight)
}