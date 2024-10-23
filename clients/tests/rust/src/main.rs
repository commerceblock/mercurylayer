
pub mod electrs;
pub mod bitcoin_core;
pub mod ta01_sign_second_not_called;
pub mod ta02_duplicate_deposits;
pub mod ta02_multiple_deposits;
pub mod tb01_simple_transfer;
pub mod tb02_transfer_address_reuse;
pub mod tb03_simple_atomic_transfer;
pub mod tb04_simple_lightning_latch;
pub mod tm01_sender_double_spends;
mod tv05;
use anyhow::{Result, Ok};

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> {

    tb01_simple_transfer::execute().await?;
    tb02_transfer_address_reuse::execute().await?;
    tb03_simple_atomic_transfer::execute().await?;
    tb04_simple_lightning_latch::execute().await?;
    tm01_sender_double_spends::execute().await?;
    ta01_sign_second_not_called::execute().await?;
    ta02_duplicate_deposits::execute().await?;
    tv05::execute().await?;

    // ta02_multiple_deposits::execute().await?;
    
    Ok(())
}
