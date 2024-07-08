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
