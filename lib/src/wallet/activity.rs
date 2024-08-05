use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
#[wasm_bindgen]
pub struct Activity {
    utxo: String,
    amount: u32,
    action: String,
    date: String
}

#[wasm_bindgen]
impl Activity {
    #[wasm_bindgen(constructor)]
    pub fn new(utxo: String, amount: u32, action: String, date: String) -> Self {
        Self {
            utxo,
            amount,
            action,
            date
        }
    }
}