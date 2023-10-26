mod utils;

use mercury_lib::{wallet::{Wallet, Token, Coin, Activity}, utils::ServerConfig, deposit::DepositMsg1Response};
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use bip39::Mnemonic;
use rand::Rng;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
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

    mercury_lib::wallet::set_config(&mut wallet, &config);

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
        balance += coin.amount.unwrap();
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
pub fn generateMnemonic() -> String {
    let mut rng = rand::thread_rng();
    let entropy = (0..16).map(|_| rng.gen::<u8>()).collect::<Vec<u8>>(); // 16 bytes of entropy for 12 words
    let mnemonic = Mnemonic::from_entropy(&entropy).unwrap();
    mnemonic.to_string()
}

#[wasm_bindgen]
pub fn fromMnemonic(name: String, mnemonic: String) -> JsValue {
    let mut wallet = Wallet {
        name: name,
        mnemonic: mnemonic,
        version: String::from("0.1.0"),
        state_entity_endpoint: String::from(""),
        electrum_endpoint: String::from(""),
        network: String::from("testnet"),
        blockheight: 0,
        initlock: 100000,
        interval: 10,
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
pub fn getNewCoin(wallet_json: JsValue) -> JsValue {
    let wallet: Wallet = serde_wasm_bindgen::from_value(wallet_json).unwrap();
    let coin = wallet.get_new_coin().unwrap();
    serde_wasm_bindgen::to_value(&coin).unwrap()
}

#[wasm_bindgen]
pub fn createDepositMsg1(coin_json: JsValue, token_id: String, amount: u32) -> JsValue {
    let coin: Coin = serde_wasm_bindgen::from_value(coin_json).unwrap();
    let deposit_msg_1 = mercury_lib::deposit::create_deposit_msg1(&coin, &token_id, amount).unwrap();
    serde_wasm_bindgen::to_value(&deposit_msg_1).unwrap()
}

#[wasm_bindgen]
pub fn handleDepositMsg1Response(coin_json: JsValue, deposit_msg_1_response_json: JsValue) -> JsValue {
    let coin: Coin = serde_wasm_bindgen::from_value(coin_json).unwrap();
    let deposit_msg_1_response: DepositMsg1Response = serde_wasm_bindgen::from_value(deposit_msg_1_response_json).unwrap();
    let deposit_init_result = mercury_lib::deposit::handle_deposit_msg_1_response(&coin, &deposit_msg_1_response).unwrap();
    serde_wasm_bindgen::to_value(&deposit_init_result).unwrap()
}

/*
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
 */
#[wasm_bindgen]
pub fn getMockWallet() -> JsValue {
    let tokens = vec![
        Token {
            token_id: String::from("e08aee00-cfed-4ab7-b304-38d61405720e"),
            value: 10000,
            invoice: String::from("lnbc10u1pj3knpdsp5k9f25s2wpzewkf9c78pftkgnkuuz82erkcjml7zkgsp7znyhs5yspp5rxz3tkc7ydgln3u7ez6duhp0g6jpzgtnn7ph5xrjy6muh9xm07wqdp2f9h8vmmfvdjjqen0wgsy6ctfdeehgcteyp6x76m9dcxqyjw5qcqpj9qyysgq6z9whs8am75r6mzcgt76vlwgk5g9yq5g8xefdxx6few6d5why7fs7h5g2dx9hk7s60ywtnkyc0f3p0cha4a9kmgkq5jvu5e7hvsaawqpjtf8p4"),
            confirmed: true
        },
        Token {
            token_id: String::from("aed9a34c-5666-4d83-940f-9b74e16b8672"),
            value: 50000,
            invoice: String::from("lnbc10u1pj3knpdsp5k9f25s2wpzewkf9c78pftkgnkuuz82erkcjml7zkgsp7znyhs5yspp5rxz3tkc7ydgln3u7ez6duhp0g6jpzgtnn7ph5xrjy6muh9xm07wqdp2f9h8vmmfvdjjqen0wgsy6ctfdeehgcteyp6x76m9dcxqyjw5qcqpj9qyysgq6z9whs8am75r6mzcgt76vlwgk5g9yq5g8xefdxx6few6d5why7fs7h5g2dx9hk7s60ywtnkyc0f3p0cha4a9kmgkq5jvu5e7hvsaawqpjtf8p4"),
            confirmed: true
        }
    ];

    let activity = vec![
        Activity {
            utxo: String::from("9ec324592502d377dc92cee0cce84b532ce912e0379bdd3d768339819251cf57:0"),
            amount: 1000000,
            action: String::from("deposit"),
            date: 1681731386490
        },
        Activity {
            utxo: String::from("e29e13b48c83b40e1fd81120c55144c5593dca6017f098422983f7dfaeb70913:0"),
            amount: 10000000,
            action: String::from("Receive"),
            date: 1687283786064
        },
        Activity {
            utxo: String::from("84fa1bd2ff0fb9bd5ee4256671c4f6a40dca311e5301668b282dbf66a6bedcc6100p:0"),
            amount: 5000000,
            action: String::from("Receive"),
            date: 1681320270800
        }
    ];

    /*let coins = vec![
        Coin {
            utxo: String::from("9ec324592502d377dc92cee0cce84b532ce912e0379bdd3d768339819251cf57:0"),
            index: 1,
            address: String::from("sc1qd8tt2cme0heruuf9zlxeygq96lum7qzl4tf32hnkyvlta9gqvumud8su7pvdzelx5ku2hrggwhuv5v3x824re8gcjl7yhq4quhtf5vfgwszp5"),
            amount: 100,
            statechain_id: String::from("6bbf638f-107f-4ea0-8e72-1a72b7e8155b"),
            privkey: String::from("fed3c39e0b1a2cfcd4b71571a10ebf194644c7554793a312ff8970541cbad346"),
            auth_key: String::from("f5a3717cfff6a03f8f8d8681b34558ac60f706ee3e68b29b6c130acd45c33da1"),
            locktime: 854231,
            status: String::from("Confirmed"),
        },
        Coin {
            utxo: String::from("e29e13b48c83b40e1fd81120c55144c5593dca6017f098422983f7dfaeb70913:0"),
            index: 2,
            address: String::from("sc1qd8tt2cme0heruuf9zlxeygq96lum7qzl4tf32hnkyvlta9gqvumud8su7pvdzelx5ku2hrggwhuv5v3x824re8gcjl7yhq4quhtf5vfgwszp5"),
            amount: 200,
            statechain_id: String::from("aed9a34c-5666-4d83-940f-9b74e16b8672"),
            privkey: String::from("60e9cec644dc22e0137088729d61372436de6067a7625b3b0733bf0c98ae04a2"),
            auth_key: String::from("a3e88f9f13ef06cd35ac55d2c34c8ce2e8874cccb50e2545975f046f7acee8f1"),
            locktime: 845321,
            status: String::from("Confirmed"),
        },
        Coin {
            utxo: String::from("84fa1bd2ff0fb9bd5ee4256671c4f6a40dca311e5301668b282dbf66a6bedcc6100p:0"),
            index: 3,
            address: String::from("sc1qd8tt2cme0heruuf9zlxeygq96lum7qzl4tf32hnkyvlta9gqvumud8su7pvdzelx5ku2hrggwhuv5v3x824re8gcjl7yhq4quhtf5vfgwszp5"),
            amount: 300,
            statechain_id: String::from("b94cba9b-93f8-419f-8adb-a943125a20f8"),
            privkey: String::from("60e9cec644dc22e0137088729d61372436de6067a7625b3b0733bf0c98ae04a2"),
            auth_key: String::from("a3e88f9f13ef06cd35ac55d2c34c8ce2e8874cccb50e2545975f046f7acee8f1"),
            locktime: 835321,
            status: String::from("Confirmed"),
        }
    ]; */

    let wallet = Wallet {
        name: String::from("Mock Wallet"),
        mnemonic: String::from("coil knock parade empower divorce scorpion float force carbon side wonder choice"),
        version: String::from("0.1.0"),
        state_entity_endpoint: String::from(""),
        electrum_endpoint: String::from(""),
        network: String::from("testnet"),
        blockheight: 0,
        initlock: 100000,
        interval: 10,
        tokens: tokens,
        activity: activity,
        coins: Vec::new() // coins
    };
    serde_wasm_bindgen::to_value(&wallet).unwrap()
}