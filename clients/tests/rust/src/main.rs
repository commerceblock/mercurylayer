
pub mod electrs;
pub mod bitcoin_core;
pub mod tb01_simple_transfer;
pub mod tb02_transfer_address_reuse;
use anyhow::{Result, Ok};

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> {

    tb01_simple_transfer::execute().await?;
    tb02_transfer_address_reuse::execute().await?;

    Ok(())
}
