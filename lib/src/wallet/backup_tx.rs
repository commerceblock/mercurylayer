
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
#[wasm_bindgen]
pub struct BackupTx {
    tx_n: u32,
    tx: String,
    client_public_nonce: String,
    server_public_nonce: String,
    client_public_key: String,
    server_public_key: String,
    blinding_factor: String,
}

#[wasm_bindgen]
impl BackupTx {

    #[wasm_bindgen(constructor)]
    pub fn new(tx_n: u32, tx: String, client_public_nonce: String, server_public_nonce: String, client_public_key: String, server_public_key: String, blinding_factor: String) -> Self {
        Self {
            tx_n,
            tx,
            client_public_nonce,
            server_public_nonce,
            client_public_key,
            server_public_key,
            blinding_factor
        }
    }

    #[wasm_bindgen(getter)]
    pub fn tx_n(&self) -> u32 {
        self.tx_n.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_tx_n(&mut self, tx_n: u32) {
        self.tx_n = tx_n;
    }

    #[wasm_bindgen(getter)]
    pub fn tx(&self) -> String {
        self.tx.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_tx(&mut self, tx: String) {
        self.tx = tx;
    }

    #[wasm_bindgen(getter)]
    pub fn client_public_nonce(&self) -> String {
        self.client_public_nonce.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_client_public_nonce(&mut self, client_public_nonce: String) {
        self.client_public_nonce = client_public_nonce;
    }

    #[wasm_bindgen(getter)]
    pub fn server_public_nonce(&self) -> String {
        self.server_public_nonce.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_server_public_nonce(&mut self, server_public_nonce: String) {
        self.server_public_nonce = server_public_nonce;
    }

    #[wasm_bindgen(getter)]
    pub fn client_public_key(&self) -> String {
        self.client_public_key.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_client_public_key(&mut self, client_public_key: String) {
        self.client_public_key = client_public_key;
    }

    #[wasm_bindgen(getter)]
    pub fn server_public_key(&self) -> String {
        self.server_public_key.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_server_public_key(&mut self, server_public_key: String) {
        self.server_public_key = server_public_key;
    }

    #[wasm_bindgen(getter)]
    pub fn blinding_factor(&self) -> String {
        self.blinding_factor.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_blinding_factor(&mut self, blinding_factor: String) {
        self.blinding_factor = blinding_factor;
    }
}
