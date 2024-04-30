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

use bitcoin::bip32;
use secp256k1_zkp::UpstreamError;

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
