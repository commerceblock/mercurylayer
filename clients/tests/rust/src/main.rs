
pub mod electrs;
pub mod bitcoin_core;
pub mod tb01_simple_transfer;
pub mod tb02_transfer_address_reuse;
pub mod tm01_sender_double_spends;
pub mod ta01_sign_second_not_called;
use anyhow::{Result, Ok};

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> {

    tb01_simple_transfer::execute().await?;
    tb02_transfer_address_reuse::execute().await?;
    tm01_sender_double_spends::execute().await?;
    ta01_sign_second_not_called::execute().await?;

    Ok(())
}
