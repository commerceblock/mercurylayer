use bitcoin::{Transaction, consensus};

/// consensus serialize tx into hex string
pub fn transaction_serialise(tx: &Transaction) -> String {
    hex::encode(consensus::serialize(tx))
}