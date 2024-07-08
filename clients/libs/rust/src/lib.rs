pub mod broadcast_backup_tx;
pub mod client_config;
pub mod coin_status;
pub mod deposit;
pub mod lightning_latch;
pub mod sqlite_manager;
pub mod transaction;
pub mod transfer_receiver;
pub mod transfer_sender;
pub mod utils;
pub mod wallet;
pub mod withdraw;

pub use mercurylib::wallet::Wallet;
pub use mercurylib::wallet::CoinStatus;
pub use mercurylib::wallet::Coin;
pub use mercurylib::wallet::BackupTx;
pub use mercurylib::wallet::Activity;

pub use mercurylib::transfer::sender::{TransferSenderRequestPayload, TransferSenderResponsePayload, create_transfer_signature, create_transfer_update_msg};
pub use mercurylib::transaction::{SignFirstRequestPayload, SignFirstResponsePayload, create_and_commit_nonces};
pub use mercurylib::utils::get_blockheight;
pub use mercurylib::{validate_address, decode_transfer_address};

pub fn add(left: usize, right: usize) -> usize {
    left + right
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }
}
