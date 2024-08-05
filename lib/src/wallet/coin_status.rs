use std::{fmt, str::FromStr};

use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[cfg_attr(feature = "bindings", derive(uniffi::Enum))]
#[wasm_bindgen]
pub enum CoinStatus {
    Initialised, //  address generated but no Tx0 yet
    InMempool, // Tx0 in mempool
    Unconfirmed, // Tx0 is awaiting more confirmations before coin is available to be sent
    Confirmed, // Tx0 confirmed and coin available to be sent
    InTransfer, // transfer-sender performed, but receiver hasn't completed transfer-receiver
    Withdrawing, // withdrawal tx signed and broadcast but not yet confirmed
    Transferred, // the coin was transferred
    Withdrawn, // the coin was withdrawn
    Duplicated, // the coin was duplicated
}

impl fmt::Display for CoinStatus {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        // Match the enum variants
        write!(f, "{}", match self {
            Self::Initialised => "INITIALISED",
            Self::InMempool => "IN_MEMPOOL",
            Self::Unconfirmed => "UNCONFIRMED",
            Self::Confirmed => "CONFIRMED",
            Self::InTransfer => "IN_TRANSFER",
            Self::Withdrawing => "WITHDRAWING",
            Self::Transferred => "TRANSFERRED",
            Self::Withdrawn => "WITHDRAWN",
            Self::Duplicated => "DUPLICATED",
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
#[wasm_bindgen]
pub struct CoinStatusParseError;

impl fmt::Display for CoinStatusParseError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "provided string was not a valid CoinStatus")
    }
}

impl std::error::Error for CoinStatusParseError {}

impl FromStr for CoinStatus {
    type Err = CoinStatusParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "INITIALISED" => Ok(CoinStatus::Initialised),
            "IN_MEMPOOL" => Ok(CoinStatus::InMempool),
            "UNCONFIRMED" => Ok(CoinStatus::Unconfirmed),
            "CONFIRMED" => Ok(CoinStatus::Confirmed),
            "IN_TRANSFER" => Ok(CoinStatus::InTransfer),
            "WITHDRAWING" => Ok(CoinStatus::Withdrawing),
            "TRANSFERRED" => Ok(CoinStatus::Transferred),
            "WITHDRAWN" => Ok(CoinStatus::Withdrawn),
            "DUPLICATED" => Ok(CoinStatus::Duplicated),
            _ => Err(CoinStatusParseError {}),
        }
    }
}