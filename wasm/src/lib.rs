mod utils;

use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, RequestInit, RequestMode, Response};

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub struct Wallet {
    name: String,
    mnemonic: String,
    version: String,
    state_entity_endpoint: String,
    electrum_endpoint: String,
    blockheight: u32,
    tokens: Vec<Token>,
    activity: Vec<Activity>,
    coins: Vec<Coin>
}

#[wasm_bindgen]
pub struct Token {
    token_id: String,
    value: u32,
    invoice: String,
    confirmed: bool
}

#[wasm_bindgen]
pub struct Activity {
    utxo: String,
    amount: u32,
    action: String,
    date: u64
}

#[wasm_bindgen]
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
    backup_txs: Vec<BackupTx>
}

#[wasm_bindgen]
pub struct BackupTx {
    tx_n: u32,
    tx: String,
    client_public_nonce: String,
    blinding_factor: String
}

#[wasm_bindgen]
pub fn fromMnemonic(name: String, mnemonic: String) -> Wallet {
    let mut wallet = Wallet {
        name: name,
        mnemonic: mnemonic,
        version: String::from("0.1.0"),
        state_entity_endpoint: String::from(""),
        electrum_endpoint: String::from(""),
        blockheight: 0,
        tokens: Vec::new(),
        activity: Vec::new(),
        coins: Vec::new()
    };
    Ok(wallet)
}

#[wasm_bindgen]
pub async fn get_repo(repo: String) -> Result<JsValue, JsValue> {
    let mut opts = RequestInit::new();
    opts.method("GET");
    opts.mode(RequestMode::Cors);

    let url = format!("https://api.github.com/repos/{}/branches/master", repo);

    let request = Request::new_with_str_and_init(&url, &opts)?;

    request
        .headers()
        .set("Accept", "application/vnd.github.v3+json")?;

    let window = web_sys::window().unwrap();
    let resp_value = JsFuture::from(window.fetch_with_request(&request)).await?;

    // `resp_value` is a `Response` object.
    assert!(resp_value.is_instance_of::<Response>());
    let resp: Response = resp_value.dyn_into().unwrap();

    // Convert this other `Promise` into a rust `Future`.
    let json = JsFuture::from(resp.json()?).await?;

    // Send the JSON response back to JS.
    Ok(json)
}