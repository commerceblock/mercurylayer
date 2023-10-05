mod utils;

use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

#[derive(Serialize, Deserialize)]
pub struct Wallet {
    name: String,
    mnemonic: String,
    version: String,
    state_entity_endpoint: String,
    electrum_endpoint: String,
    blockheight: u32,
    initlock: u32,
    interval: u32,
    backup_fee_rate: u32,
    tokens: Vec<Token>,
    activity: Vec<Activity>,
    coins: Vec<Coin>
}

#[derive(Serialize, Deserialize)]
pub struct Token {
    token_id: String,
    value: u32,
    invoice: String,
    confirmed: bool
}

#[derive(Serialize, Deserialize)]
pub struct Activity {
    utxo: String,
    amount: u32,
    action: String,
    date: u64
}

#[derive(Serialize, Deserialize)]
pub struct Coin {
    utxo: String,
    index: u32,
    address: String,
    amount: u32,
    statechain_id: String,
    privkey: String,
    auth_key: String,
    locktime: u32,
    status: String,
}

#[derive(Serialize, Deserialize)]
pub struct BackupTx {
    tx_n: u32,
    tx: String,
    client_public_nonce: String,
    blinding_factor: String
}

#[derive(Serialize, Deserialize)]
pub struct ServerConfig {
    initlock: u32,
    interval: u32,
    backup_fee_rate: u32
}

#[derive(Serialize, Deserialize)]
pub struct DepositMsg1 {
    amount: u32,
    token_id: String,
    auth_key: String
}

#[derive(Serialize, Deserialize)]
pub struct DepositMsg2 {
    statechain_id: String,
    enclave_pubkey: String,
}

#[derive(Serialize, Deserialize)]
pub struct DepositMsg3 {
    r2_commitment: String,
    blind_commitment: String,
    statechain_id: String,
    auth_sig: String,
}

#[derive(Serialize, Deserialize)]
pub struct DepositMsg4 {
    r1_public: String,
    statechain_id: String,
}

#[derive(Serialize, Deserialize)]
pub struct DepositMsg5 {
    statechain_id: String,
    challenge: String,
    auth_sig: String,
}

#[derive(Serialize, Deserialize)]
pub struct DepositMsg6 {
    partial_sig: String,
}

#[wasm_bindgen]
pub fn setConfig(config_json: JsValue, wallet_json: JsValue) -> JsValue {
    let mut wallet: Wallet = serde_wasm_bindgen::from_value(wallet_json).unwrap();
    let config: ServerConfig = serde_wasm_bindgen::from_value(config_json).unwrap();
    wallet.initlock = config.initlock;
    wallet.interval = config.interval;
    wallet.backup_fee_rate = config.backup_fee_rate;

    serde_wasm_bindgen::to_value(&wallet).unwrap()
}

#[wasm_bindgen]
pub fn setBlockheight(blockheight: u32, wallet_json: JsValue) -> JsValue {
    let mut wallet: Wallet = serde_wasm_bindgen::from_value(wallet_json).unwrap();
    wallet.blockheight = blockheight;
    serde_wasm_bindgen::to_value(&wallet).unwrap()
}

#[wasm_bindgen]
pub fn addToken(token_json: JsValue, wallet_json: JsValue) -> JsValue {
    let mut wallet: Wallet = serde_wasm_bindgen::from_value(wallet_json).unwrap();
    let token: Token = serde_wasm_bindgen::from_value(token_json).unwrap();
    wallet.tokens.push(token);
    serde_wasm_bindgen::to_value(&wallet).unwrap()
}

#[wasm_bindgen]
pub fn confirmToken(token_id: String, wallet_json: JsValue) -> JsValue {
    let mut wallet: Wallet = serde_wasm_bindgen::from_value(wallet_json).unwrap();
    for token in wallet.tokens.iter_mut() {
        if token.token_id == token_id {
            token.confirmed = true;
        }
    }
    serde_wasm_bindgen::to_value(&wallet).unwrap()
}

#[wasm_bindgen]
pub fn getTokens(wallet_json: JsValue) -> JsValue {
    let wallet: Wallet = serde_wasm_bindgen::from_value(wallet_json).unwrap();
    serde_wasm_bindgen::to_value(&wallet.tokens).unwrap()
}

#[wasm_bindgen]
pub fn getBalance(wallet_json: JsValue) -> u32 {
    let wallet: Wallet = serde_wasm_bindgen::from_value(wallet_json).unwrap();
    let mut balance = 0;
    for coin in wallet.coins.iter() {
        balance += coin.amount;
    }
    balance
}

#[wasm_bindgen]
pub fn getSCAddress(wallet_json: JsValue, index: u32) -> String {
    let wallet: Wallet = serde_wasm_bindgen::from_value(wallet_json).unwrap();
    let address = mercury_lib::get_sc_address(&wallet.mnemonic, index);
    address.to_string()
}

#[wasm_bindgen]
pub fn fromMnemonic(name: String, mnemonic: String) -> JsValue {
    let mut wallet = Wallet {
        name: name,
        mnemonic: mnemonic,
        version: String::from("0.1.0"),
        state_entity_endpoint: String::from(""),
        electrum_endpoint: String::from(""),
        blockheight: 0,
        initlock: 100000,
        interval: 10,
        backup_fee_rate: 1,
        tokens: Vec::new(),
        activity: Vec::new(),
        coins: Vec::new()
    };
    serde_wasm_bindgen::to_value(&wallet).unwrap()
}

#[wasm_bindgen]
pub fn getActivityLog(wallet_json: JsValue) -> JsValue {
    let wallet: Wallet = serde_wasm_bindgen::from_value(wallet_json).unwrap();
    serde_wasm_bindgen::to_value(&wallet.activity).unwrap()
}

#[wasm_bindgen]
pub fn getCoins(wallet_json: JsValue) -> JsValue {
    let wallet: Wallet = serde_wasm_bindgen::from_value(wallet_json).unwrap();
    serde_wasm_bindgen::to_value(&wallet.coins).unwrap()
}

#[wasm_bindgen]
pub fn getCoin(wallet_json: JsValue, statechain_id: String) -> JsValue {
    let wallet: Wallet = serde_wasm_bindgen::from_value(wallet_json).unwrap();
    for coin in wallet.coins.iter() {
        if coin.statechain_id == statechain_id {
            return serde_wasm_bindgen::to_value(&coin).unwrap();
        }
    }
    serde_wasm_bindgen::to_value(&Coin {
        utxo: String::from(""),
        index: 0,
        address: String::from(""),
        amount: 0,
        statechain_id: String::from(""),
        privkey: String::from(""),
        auth_key: String::from(""),
        locktime: 0,
        status: String::from(""),
    }).unwrap()
}
