
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

use super::backup_tx::BackupTx;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
#[wasm_bindgen]
pub struct StatechainBackupTxs {
    statechain_id: String,
    backup_txs: Vec<BackupTx>
}

#[wasm_bindgen]
impl StatechainBackupTxs {
    #[wasm_bindgen(constructor)]
    pub fn new(statechain_id: String, backup_txs: Vec<BackupTx>) -> Self {
        Self {
            statechain_id,
            backup_txs
        }
    }

    #[wasm_bindgen(getter)]
    pub fn statechain_id(&self) -> String {
        self.statechain_id.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_statechain_id(&mut self, statechain_id: String) {
        self.statechain_id = statechain_id;
    }

    #[wasm_bindgen(getter)]
    pub fn backup_txs(&self) -> Vec<BackupTx> {
        self.backup_txs.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_backup_txs(&mut self, backup_txs: Vec<BackupTx>) {
        self.backup_txs = backup_txs;
    }
}
