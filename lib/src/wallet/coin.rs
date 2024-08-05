
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

use super::coin_status::CoinStatus;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
#[wasm_bindgen]
pub struct Coin {
    
    index: u32,
    user_privkey: String,
    user_pubkey: String,
    auth_privkey: String,
    auth_pubkey: String,
    derivation_path: String,
    fingerprint: String,
    /// The coin address is the user_pubkey || auth_pubkey
    /// Used to transfer the coin to another wallet
    address: String,
    /// The backup address is the address used in backup transactions
    /// The backup address is the p2tr address of the user_pubkey
    backup_address: String,
    server_pubkey: Option<String>,
    // The aggregated_pubkey is the user_pubkey + server_pubkey
    aggregated_pubkey: Option<String>,
    /// The aggregated address is the P2TR address from aggregated_pubkey
    aggregated_address: Option<String>,
    utxo_txid: Option<String>,
    utxo_vout: Option<u32>,
    amount: Option<u32>,
    statechain_id: Option<String>,
    signed_statechain_id: Option<String>,
    locktime: Option<u32>,
    secret_nonce: Option<String>,
    public_nonce: Option<String>,
    blinding_factor: Option<String>,
    server_public_nonce: Option<String>,
    tx_cpfp: Option<String>,
    tx_withdraw: Option<String>,
    withdrawal_address: Option<String>,
    status: CoinStatus,
    duplicate_index: u32,
}

#[wasm_bindgen]
impl Coin {

    #[wasm_bindgen(constructor)]
    pub fn new(
        index: u32,
        user_privkey: String,
        user_pubkey: String,
        auth_privkey: String,
        auth_pubkey: String,
        derivation_path: String,
        fingerprint: String,
        address: String,
        backup_address: String,
        server_pubkey: Option<String>,
        aggregated_pubkey: Option<String>,
        aggregated_address: Option<String>,
        utxo_txid: Option<String>,
        utxo_vout: Option<u32>,
        amount: Option<u32>,
        statechain_id: Option<String>,
        signed_statechain_id: Option<String>,
        locktime: Option<u32>,
        secret_nonce: Option<String>,
        public_nonce: Option<String>,
        blinding_factor: Option<String>,
        server_public_nonce: Option<String>,
        tx_cpfp: Option<String>,
        tx_withdraw: Option<String>,
        withdrawal_address: Option<String>,
        status: CoinStatus,
        duplicate_index: u32,
    ) -> Self {
        Self {
            index,
            user_privkey,
            user_pubkey,
            auth_privkey,
            auth_pubkey,
            derivation_path,
            fingerprint,
            address,
            backup_address,
            server_pubkey,
            aggregated_pubkey,
            aggregated_address,
            utxo_txid,
            utxo_vout,
            amount,
            statechain_id,
            signed_statechain_id,
            locktime,
            secret_nonce,
            public_nonce,
            blinding_factor,
            server_public_nonce,
            tx_cpfp,
            tx_withdraw,
            withdrawal_address,
            status,
            duplicate_index,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn index(&self) -> u32 {
        self.index.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_index(&mut self, index: u32) {
        self.index = index;
    }

    #[wasm_bindgen(getter)]
    pub fn user_privkey(&self) -> String {
        self.user_privkey.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_user_privkey(&mut self, user_privkey: String) {
        self.user_privkey = user_privkey;
    }

    #[wasm_bindgen(getter)]
    pub fn user_pubkey(&self) -> String {
        self.user_pubkey.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_user_pubkey(&mut self, user_pubkey: String) {
        self.user_pubkey = user_pubkey;
    }

    #[wasm_bindgen(getter)]
    pub fn auth_privkey(&self) -> String {
        self.auth_privkey.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_auth_privkey(&mut self, auth_privkey: String) {
        self.auth_privkey = auth_privkey;
    }

    #[wasm_bindgen(getter)]
    pub fn auth_pubkey(&self) -> String {
        self.auth_pubkey.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_auth_pubkey(&mut self, auth_pubkey: String) {
        self.auth_pubkey = auth_pubkey;
    }

    #[wasm_bindgen(getter)]
    pub fn derivation_path(&self) -> String {
        self.derivation_path.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_derivation_path(&mut self, derivation_path: String) {
        self.derivation_path = derivation_path;
    }

    #[wasm_bindgen(getter)]
    pub fn fingerprint(&self) -> String {
        self.fingerprint.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_fingerprint(&mut self, fingerprint: String) {
        self.fingerprint = fingerprint;
    }

    #[wasm_bindgen(getter)]
    pub fn address(&self) -> String {
        self.address.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_address(&mut self, address: String) {
        self.address = address;
    }

    #[wasm_bindgen(getter)]
    pub fn backup_address(&self) -> String {
        self.backup_address.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_backup_address(&mut self, backup_address: String) {
        self.backup_address = backup_address;
    }

    #[wasm_bindgen(getter)]
    pub fn server_pubkey(&self) -> Option<String> {
        self.server_pubkey.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_server_pubkey(&mut self, server_pubkey: Option<String>) {
        self.server_pubkey = server_pubkey;
    }

    #[wasm_bindgen(getter)]
    pub fn aggregated_pubkey(&self) -> Option<String> {
        self.aggregated_pubkey.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_aggregated_pubkey(&mut self, aggregated_pubkey: Option<String>) {
        self.aggregated_pubkey = aggregated_pubkey;
    }

    #[wasm_bindgen(getter)]
    pub fn aggregated_address(&self) -> Option<String> {
        self.aggregated_address.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_aggregated_address(&mut self, aggregated_address: Option<String>) {
        self.aggregated_address = aggregated_address;
    }

    #[wasm_bindgen(getter)]
    pub fn utxo_txid(&self) -> Option<String> {
        self.utxo_txid.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_utxo_txid(&mut self, utxo_txid: Option<String>) {
        self.utxo_txid = utxo_txid;
    }

    #[wasm_bindgen(getter)]
    pub fn utxo_vout(&self) -> Option<u32> {
        self.utxo_vout.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_utxo_vout(&mut self, utxo_vout: Option<u32>) {
        self.utxo_vout = utxo_vout;
    }

    #[wasm_bindgen(getter)]
    pub fn amount(&self) -> Option<u32> {
        self.amount.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_amount(&mut self, amount: Option<u32>) {
        self.amount = amount;
    }

    #[wasm_bindgen(getter)]
    pub fn statechain_id(&self) -> Option<String> {
        self.statechain_id.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_statechain_id(&mut self, statechain_id: Option<String>) {
        self.statechain_id = statechain_id;
    }

    #[wasm_bindgen(getter)]
    pub fn signed_statechain_id(&self) -> Option<String> {
        self.signed_statechain_id.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_signed_statechain_id(&mut self, signed_statechain_id: Option<String>) {
        self.signed_statechain_id = signed_statechain_id;
    }

    #[wasm_bindgen(getter)]
    pub fn locktime(&self) -> Option<u32> {
        self.locktime.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_locktime(&mut self, locktime: Option<u32>) {
        self.locktime = locktime;
    }

    #[wasm_bindgen(getter)]
    pub fn secret_nonce(&self) -> Option<String> {
        self.secret_nonce.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_secret_nonce(&mut self, secret_nonce: Option<String>) {
        self.secret_nonce = secret_nonce;
    }

    #[wasm_bindgen(getter)]
    pub fn public_nonce(&self) -> Option<String> {
        self.public_nonce.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_public_nonce(&mut self, public_nonce: Option<String>) {
        self.public_nonce = public_nonce;
    }

    #[wasm_bindgen(getter)]
    pub fn blinding_factor(&self) -> Option<String> {
        self.blinding_factor.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_blinding_factor(&mut self, blinding_factor: Option<String>) {
        self.blinding_factor = blinding_factor;
    }

    #[wasm_bindgen(getter)]
    pub fn server_public_nonce(&self) -> Option<String> {
        self.server_public_nonce.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_server_public_nonce(&mut self, server_public_nonce: Option<String>) {
        self.server_public_nonce = server_public_nonce;
    }

    #[wasm_bindgen(getter)]
    pub fn tx_cpfp(&self) -> Option<String> {
        self.tx_cpfp.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_tx_cpfp(&mut self, tx_cpfp: Option<String>) {
        self.tx_cpfp = tx_cpfp;
    }

    #[wasm_bindgen(getter)]
    pub fn tx_withdraw(&self) -> Option<String> {
        self.tx_withdraw.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_tx_withdraw(&mut self, tx_withdraw: Option<String>) {
        self.tx_withdraw = tx_withdraw;
    }

    #[wasm_bindgen(getter)]
    pub fn withdrawal_address(&self) -> Option<String> {
        self.withdrawal_address.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_withdrawal_address(&mut self, withdrawal_address: Option<String>) {
        self.withdrawal_address = withdrawal_address;
    }

    #[wasm_bindgen(getter)]
    pub fn status(&self) -> CoinStatus {
        self.status.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_status(&mut self, status: CoinStatus) {
        self.status = status;
    }

    #[wasm_bindgen(getter)]
    pub fn duplicate_index(&self) -> u32 {
        self.duplicate_index.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_duplicate_index(&mut self, duplicate_index: u32) {
        self.duplicate_index = duplicate_index;
    }
}
