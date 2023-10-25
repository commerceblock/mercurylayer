use anyhow::Result;
use mercury_lib::{wallet::{Wallet}, deposit::create_deposit_msg1};
use sqlx::{Pool, Sqlite};

use crate::sqlite_manager::{update_wallet, get_wallet};

pub async fn execute(pool: &Pool<Sqlite>, wallet_name: &str, token_id: uuid::Uuid, amount: u64) -> Result<()> {

    let mut wallet = get_wallet(pool, wallet_name).await?;

    let coin = wallet.get_new_coin()?;

    wallet.coins.push(coin.clone());

    update_wallet(pool, &wallet).await?;

    let deposit_msg_1 = create_deposit_msg1(&coin, &token_id.to_string(), amount)?;

    println!("deposit_msg_1: {:?}", deposit_msg_1);


    Ok(())
}

