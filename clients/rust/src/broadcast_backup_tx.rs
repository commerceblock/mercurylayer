use crate::{client_config::ClientConfig, sqlite_manager::{get_backup_txs, get_wallet, update_wallet}};
use anyhow::{anyhow, Result};
use electrum_client::ElectrumApi;
use mercurylib::wallet::{cpfp_tx, CoinStatus};

pub async fn execute(client_config: &ClientConfig, wallet_name: &str, statechain_id: &str, to_address: &str, fee_rate: Option<u64>) -> Result<()> {
    
    let mut wallet: mercurylib::wallet::Wallet = get_wallet(&client_config.pool, &wallet_name).await?;

    let is_address_valid = mercurylib::validate_address(to_address, &wallet.network)?;

    if !is_address_valid {
        return Err(anyhow!("Invalid address"));
    }

    let is_address_valid = mercurylib::validate_address(to_address, &wallet.network)?;

    if !is_address_valid {
        return Err(anyhow!("Invalid address"));
    }

    let backup_txs = get_backup_txs(&client_config.pool, &statechain_id).await?;
    
    let backup_tx = backup_txs.iter().max_by_key(|tx| tx.tx_n);

    if backup_tx.is_none() {
        return Err(anyhow!("No backup transaction associated with this statechain ID were found"));
    }

    let backup_tx = backup_tx.unwrap();

    // If the user sends to himself, he will have two coins with same statechain_id
    // In this case, we need to find the one with the lowest locktime
    let coin = wallet.coins
        .iter_mut()
        .filter(|tx| tx.statechain_id == Some(statechain_id.to_string())) // Filter coins with the specified statechain_id
        .min_by_key(|tx| tx.locktime); // Find the one with the lowest locktime

    if coin.is_none() {
        return Err(anyhow!("No coins associated with this statechain ID were found"));
    }

    let coin = coin.unwrap();

    if coin.status != CoinStatus::CONFIRMED {
        return Err(anyhow::anyhow!("Coin status must be CONFIRMED to broadcast the backup transaction. The current status is {}", coin.status));
    }

    let fee_rate = match fee_rate {
        Some(fee_rate) => fee_rate,
        None => {
            let mut fee_rate_btc_per_kb = client_config.electrum_client.estimate_fee(1)?;

            // Why does it happen?
            if fee_rate_btc_per_kb <= 0.0 {
                fee_rate_btc_per_kb = 0.00001;
            }

            let fee_rate_sats_per_byte = (fee_rate_btc_per_kb * 100000.0) as u64;
            fee_rate_sats_per_byte
        },
    };

    let cpfp_tx = cpfp_tx::create(&backup_tx, &coin, to_address, fee_rate, &wallet.network)?;

    let tx_bytes = hex::decode(&backup_tx.tx)?;
    let txid = client_config.electrum_client.transaction_broadcast_raw(&tx_bytes)?;
    println!("Broadcasting backup transaction: {}", txid);

    let tx_bytes = hex::decode(&cpfp_tx)?;
    let txid = client_config.electrum_client.transaction_broadcast_raw(&tx_bytes)?;
    println!("Broadcasting CPFP transaction: {}", txid);

    coin.tx_cpfp = Some(txid.to_string());
    coin.withdrawal_address = Some(to_address.to_string());
    coin.status = CoinStatus::WITHDRAWING;

    update_wallet(&client_config.pool, &wallet).await?;

    Ok(())
}