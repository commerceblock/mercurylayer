use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
#[wasm_bindgen]
pub struct Token {
    btc_payment_address: String,
    fee: String,
    lightning_invoice: String,
    processor_id: String,
    token_id: String,
    confirmed: bool,
    spent: bool,
    expiry: String,
}

#[wasm_bindgen]
impl Token {

    #[wasm_bindgen(constructor)]
    pub fn new(
        btc_payment_address: String, 
        fee: String, 
        lightning_invoice: String, 
        processor_id: String, 
        token_id: String, 
        confirmed: bool, 
        spent: bool, 
        expiry: String) -> Self 
    {
        Self {
            btc_payment_address,
            fee,
            lightning_invoice,
            processor_id,
            token_id,
            confirmed,
            spent,
            expiry
        }
    }

    #[wasm_bindgen(getter)]
    pub fn btc_payment_address(&self) -> String {
        self.btc_payment_address.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_btc_payment_address(&mut self, btc_payment_address: String) {
        self.btc_payment_address = btc_payment_address;
    }

    #[wasm_bindgen(getter)]
    pub fn fee(&self) -> String {
        self.fee.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_fee(&mut self, fee: String) {
        self.fee = fee;
    }

    #[wasm_bindgen(getter)]
    pub fn lightning_invoice(&self) -> String {
        self.lightning_invoice.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_lightning_invoice(&mut self, lightning_invoice: String) {
        self.lightning_invoice = lightning_invoice;
    }

    #[wasm_bindgen(getter)]
    pub fn processor_id(&self) -> String {
        self.processor_id.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_processor_id(&mut self, processor_id: String) {
        self.processor_id = processor_id;
    }

    #[wasm_bindgen(getter)]
    pub fn token_id(&self) -> String {
        self.token_id.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_token_id(&mut self, token_id: String) {
        self.token_id = token_id;
    }

    #[wasm_bindgen(getter)]
    pub fn confirmed(&self) -> bool {
        self.confirmed.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_confirmed(&mut self, confirmed: bool) {
        self.confirmed = confirmed;
    }

    #[wasm_bindgen(getter)]
    pub fn spent(&self) -> bool {
        self.spent.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_spent(&mut self, spent: bool) {
        self.spent = spent;
    }

    #[wasm_bindgen(getter)]
    pub fn expiry(&self) -> String {
        self.expiry.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_expiry(&mut self, expiry: String) {
        self.expiry = expiry;
    }
}
