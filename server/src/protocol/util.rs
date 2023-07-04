use shared::structs::StateEntityFeeInfoAPI;

use crate::StateChainEntity;
use crate::error;

pub trait Utilities {
    /// API: Return StateChain Entity fee information.
    fn get_fees(&self) -> Result<StateEntityFeeInfoAPI, error::SEError>;
}

impl Utilities for StateChainEntity {
    fn get_fees(&self) -> Result<StateEntityFeeInfoAPI, error::SEError> {
        let fee_address_vec: Vec<&str> = self.config.fee_address.split(",").collect();
        Ok(StateEntityFeeInfoAPI {
            address: fee_address_vec[0].to_string().clone(),
            deposit: self.config.fee_deposit as i64,
            withdraw: self.config.fee_withdraw,
            interval: self.config.lh_decrement,
            initlock: self.config.lockheight_init,
            wallet_version: self.config.wallet_version.clone(),
            wallet_message: self.config.wallet_message.clone(),
        })
    }
}