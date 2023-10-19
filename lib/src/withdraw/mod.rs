use bitcoin::{Address, Txid};
use secp256k1_zkp::{SecretKey, PublicKey, schnorr::Signature};
use serde::{Serialize, Deserialize};

pub struct CoinKeyDetails {
    pub new_tx_n: u32,
    pub client_seckey: SecretKey,
    pub client_pubkey: PublicKey,
    pub amount: u64,
    pub server_pubkey: PublicKey,
    pub aggregated_pubkey: PublicKey,
    pub p2tr_agg_address: Address,
    pub auth_seckey: SecretKey,
    pub signed_statechain_id: Signature,
    pub utxo_tx_hash: Txid,
    pub utxo_vout: u32,
}


#[derive(Serialize, Deserialize)]
pub struct DeleteStatechainPayload {
    pub statechain_id: String,
    pub signed_statechain_id: String,
}