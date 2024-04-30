/*
The simplified struct below cannot be used because the errors from other libs are not compatible with uniffi.
TODO: Look for a way to make the errors compatible with uniffi.

#[derive(Debug, thiserror::Error)]
#[cfg_attr(feature = "bindings", derive(uniffi::Error))]
pub enum MercuryError {
    #[error("BIP39 Error: {0}")]
    Bip39Error(#[from] bip39::Error),

    #[error("BIP32 Error: {0}")]
    Bip32Error(#[from] bip32::Error),

    #[error("Invalid bitcoin network: `{0}`")]
    NetworkConversionError(String),

    #[error("Secp256k1UpstreamError Error: {0}")]
    Secp256k1UpstreamError(#[from] UpstreamError),

    #[error("KeyError Error: {0}")]
    KeyError(#[from] bitcoin::key::Error),

    #[error("Bech32Error Error: {0}")]
    Bech32Error(#[from] bech32::Error),
}
 */

use bitcoin::{bip32, sighash::SighashTypeParseError};
use secp256k1_zkp::{musig::{MusigNonceGenError, MusigSignError, ParseError}, UpstreamError};

// TODO: UniFFI apparently does not support adding fields to the error enum variants.
//       For example, NetworkConversionError(String) is not supported.
//       This makes it impossible to detail the error message. Look into this issue.

#[derive(Debug, thiserror::Error)]
#[cfg_attr(feature = "bindings", derive(uniffi::Error))]
pub enum MercuryError {
    Bip39Error,
    Bip32Error,
    NetworkConversionError,
    Secp256k1UpstreamError,
    KeyError,
    Bech32Error,
    HexError,
    LocktimeNotBlockHeightError,
    BitcoinConsensusEncodeError,
    MusigNonceGenError,
    InvalidStatechainAddressError,
    InvalidBitcoinAddressError,
    StatechainAddressMismatchNetworkError,
    BitcoinAddressMismatchNetworkError,
    BitcoinAddressError,
    BitcoinAbsoluteError,
    BitcoinHashHexError,
    BitcoinPsbtError,
    SighashTypeParseError,
    BitcoinSighashError,
    ParseError,
    MusigSignError,
    SchnorrSignatureValidationError,
    MoreThanOneInputError,
    UnkownNetwork,
    BackupTransactionDoesNotPayUser,
    FeeTooHigh,

}

impl core::fmt::Display for MercuryError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_fmt(format_args!("{:?}", self))
    }
}

impl From<bip39::Error> for MercuryError {
    fn from(_: bip39::Error) -> Self {
        MercuryError::Bip39Error
    }
}

impl From<bip32::Error> for MercuryError {
    fn from(_: bip32::Error) -> Self {
        MercuryError::Bip32Error
    }
}

impl From<UpstreamError> for MercuryError {
    fn from(_: UpstreamError) -> Self {
        MercuryError::Secp256k1UpstreamError
    }
}

impl From<bitcoin::key::Error> for MercuryError {
    fn from(_: bitcoin::key::Error) -> Self {
        MercuryError::KeyError
    }
}

impl From<bech32::Error> for MercuryError {
    fn from(_: bech32::Error) -> Self {
        MercuryError::Bech32Error
    }
}

impl From<hex::FromHexError> for MercuryError {
    fn from(_: hex::FromHexError) -> Self {
        MercuryError::HexError
    }
}

impl From<bitcoin::consensus::encode::Error> for MercuryError {
    fn from(_: bitcoin::consensus::encode::Error) -> Self {
        MercuryError::BitcoinConsensusEncodeError
    }
}

impl From<MusigNonceGenError> for MercuryError {
    fn from(_: MusigNonceGenError) -> Self {
        MercuryError::MusigNonceGenError
    }
}

impl From<bitcoin::address::Error> for MercuryError {
    fn from(_: bitcoin::address::Error) -> Self {
        MercuryError::BitcoinAddressError
    }
}

impl From<bitcoin::absolute::Error> for MercuryError {
    fn from(_: bitcoin::absolute::Error) -> Self {
        MercuryError::BitcoinAbsoluteError
    }
}

impl From<bitcoin::hashes::hex::Error> for MercuryError {
    fn from(_: bitcoin::hashes::hex::Error) -> Self {
        MercuryError::BitcoinHashHexError
    }
}

impl From<bitcoin::psbt::Error> for MercuryError {
    fn from(_: bitcoin::psbt::Error) -> Self {
        MercuryError::BitcoinPsbtError
    }
}

impl From<SighashTypeParseError> for MercuryError {
    fn from(_: SighashTypeParseError) -> Self {
        MercuryError::SighashTypeParseError
    }
}

impl From<bitcoin::sighash::Error> for MercuryError {
    fn from(_: bitcoin::sighash::Error) -> Self {
        MercuryError::BitcoinSighashError
    }
}

impl From<ParseError> for MercuryError {
    fn from(_: ParseError) -> Self {
        MercuryError::ParseError
    }
}

impl From<MusigSignError> for MercuryError {
    fn from(_: MusigSignError) -> Self {
        MercuryError::MusigSignError
    }
}
