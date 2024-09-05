use crate::{client_config::ClientConfig, sqlite_manager::{get_backup_txs, get_wallet, update_wallet}};
use anyhow::{anyhow, Result};
use electrum_client::ElectrumApi;
use mercurylib::wallet::{cpfp_tx, CoinStatus};

pub async fn execute(client_config: &ClientConfig, wallet_name: &str, statechain_id: &str, to_address: Option<String>, fee_rate: Option<f64>) -> Result<()> {
    
    let mut wallet: mercurylib::wallet::Wallet = get_wallet(&client_config.pool, &wallet_name).await?;

    if to_address.is_some() {
        let to_address = to_address.clone().unwrap();
        let is_address_valid = mercurylib::validate_address(&to_address, &wallet.network)?;

        if !is_address_valid {
            return Err(anyhow!("Invalid address"));
        }
    }

    let backup_txs = get_backup_txs(&client_config.pool, &statechain_id).await?;
    
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

    if coin.status != CoinStatus::CONFIRMED && coin.status != CoinStatus::IN_TRANSFER {
        return Err(anyhow::anyhow!("Coin status must be CONFIRMED or IN_TRANSFER to transfer it. The current status is {}", coin.status));
    }

    let backup_tx = cpfp_tx::latest_backup_tx_pays_to_user_pubkey(&backup_txs, &coin,  &wallet.network)?;

    let cpfp_tx = if to_address.is_some() {

        let to_address = to_address.clone().unwrap();

        let fee_rate = match fee_rate {
            Some(fee_rate) => fee_rate,
            None => {
                let mut fee_rate_btc_per_kb = client_config.electrum_client.estimate_fee(1)?;

                // Why does it happen?
                if fee_rate_btc_per_kb <= 0.0 {
                    fee_rate_btc_per_kb = 0.00001;
                }

                let fee_rate_sats_per_byte = fee_rate_btc_per_kb * 100000.0;

                if fee_rate_sats_per_byte > client_config.max_fee_rate {
                    client_config.max_fee_rate
                } else {
                    fee_rate_sats_per_byte
                }
            },
        };

        Some(cpfp_tx::create_cpfp_tx(&backup_tx, &coin, &to_address, fee_rate, &wallet.network)?)
    } else { 
        None
    };

    let tx_bytes = hex::decode(&backup_tx.tx)?;
    let mut txid = client_config.electrum_client.transaction_broadcast_raw(&tx_bytes)?;

    if cpfp_tx.is_some() {
        let cpfp_tx = cpfp_tx.unwrap();
        let tx_bytes = hex::decode(&cpfp_tx)?;
        txid = client_config.electrum_client.transaction_broadcast_raw(&tx_bytes)?;
    }
    
    coin.tx_cpfp = Some(txid.to_string());
    coin.withdrawal_address = if to_address.is_some() { Some(to_address.unwrap()) } else { Some(coin.backup_address.clone()) };
    coin.status = CoinStatus::WITHDRAWING;

    let signed_statechain_id = coin.signed_statechain_id.as_ref().unwrap().to_string();

    update_wallet(&client_config.pool, &wallet).await?;

    crate::utils::complete_withdraw(statechain_id, &signed_statechain_id, &client_config).await?;

    Ok(())
}