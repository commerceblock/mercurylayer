pub mod key_derivation;
pub mod cpfp_tx;
pub mod coin;
pub mod coin_status;
pub mod activity;
pub mod backup_tx;
pub mod statechain_backup_txs;
pub mod token;
pub mod settings;

use activity::Activity;
use bip39::{Mnemonic, Language};
use coin::Coin;
use settings::Settings;
use token::Token;
use wasm_bindgen::prelude::*;
use secp256k1_zkp::rand::{self, Rng};
use serde::{Serialize, Deserialize};

use crate::{utils::ServerConfig, MercuryError};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
#[wasm_bindgen]
pub struct Wallet {
    name: String,
    mnemonic: String,
    version: String,
    state_entity_endpoint: String,
    electrum_endpoint: String,
    network: String,
    blockheight: u32,
    initlock: u32,
    interval: u32,
    tokens: Vec<Token>,
    activities: Vec<Activity>,
    coins: Vec<Coin>,
    settings: Settings,
}

#[wasm_bindgen]
impl Wallet {

    #[wasm_bindgen(constructor)]
    pub fn new(
        name: String,
        mnemonic: String,
        version: String,
        state_entity_endpoint: String,
        electrum_endpoint: String,
        network: String,
        blockheight: u32,
        initlock: u32,
        interval: u32,
        tokens: Vec<Token>,
        activities: Vec<Activity>,
        coins: Vec<Coin>,
        settings: Settings
    ) -> Self {
        Self {
            name,
            mnemonic,
            version,
            state_entity_endpoint,
            electrum_endpoint,
            network,
            blockheight,
            initlock,
            interval,
            tokens,
            activities,
            coins,
            settings
        }
    }

    #[wasm_bindgen(getter)]
    pub fn name(&self) -> String {
        self.name.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_name(&mut self, name: String) {
        self.name = name;
    }

    #[wasm_bindgen(getter)]
    pub fn mnemonic(&self) -> String {
        self.mnemonic.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_mnemonic(&mut self, mnemonic: String) {
        self.mnemonic = mnemonic;
    }

    #[wasm_bindgen(getter)]
    pub fn version(&self) -> String {
        self.version.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_version(&mut self, version: String) {
        self.version = version;
    }

    #[wasm_bindgen(getter)]
    pub fn state_entity_endpoint(&self) -> String {
        self.state_entity_endpoint.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_state_entity_endpoint(&mut self, state_entity_endpoint: String) {
        self.state_entity_endpoint = state_entity_endpoint;
    }

    #[wasm_bindgen(getter)]
    pub fn electrum_endpoint(&self) -> String {
        self.electrum_endpoint.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_electrum_endpoint(&mut self, electrum_endpoint: String) {
        self.electrum_endpoint = electrum_endpoint;
    }

    #[wasm_bindgen(getter)]
    pub fn network(&self) -> String {
        self.network.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_network(&mut self, network: String) {
        self.network = network;
    }

    #[wasm_bindgen(getter)]
    pub fn blockheight(&self) -> u32 {
        self.blockheight.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_blockheight(&mut self, blockheight: u32) {
        self.blockheight = blockheight;
    }

    #[wasm_bindgen(getter)]
    pub fn initlock(&self) -> u32 {
        self.initlock.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_initlock(&mut self, initlock: u32) {
        self.initlock = initlock;
    }

    #[wasm_bindgen(getter)]
    pub fn interval(&self) -> u32 {
        self.interval.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_interval(&mut self, interval: u32) {
        self.interval = interval;
    }

    #[wasm_bindgen(getter)]
    pub fn tokens(&self) -> Vec<Token> {
        self.tokens.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_tokens(&mut self, tokens: Vec<Token>) {
        self.tokens = tokens;
    }

    #[wasm_bindgen(getter)]
    pub fn activities(&self) -> Vec<Activity> {
        self.activities.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_activities(&mut self, activities: Vec<Activity>) {
        self.activities = activities;
    }

    #[wasm_bindgen(getter)]
    pub fn coins(&self) -> Vec<Coin> {
        self.coins.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_coins(&mut self, coins: Vec<Coin>) {
        self.coins = coins;
    }

    #[wasm_bindgen(getter)]
    pub fn settings(&self) -> Settings {
        self.settings.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_settings(&mut self, settings: Settings) {
        self.settings = settings;
    }
}

pub fn set_config(wallet: &mut Wallet, config: &ServerConfig) {
    wallet.initlock = config.initlock;
    wallet.interval = config.interval;
}

#[cfg_attr(feature = "bindings", uniffi::export)]
pub fn generate_mnemonic() -> core::result::Result<String, MercuryError> {
    let mut rng = rand::thread_rng();
    let entropy = (0..16).map(|_| rng.gen::<u8>()).collect::<Vec<u8>>(); // 16 bytes of entropy for 12 words
    let mnemonic = Mnemonic::from_entropy_in(Language::English, &entropy)?;
    Ok(mnemonic.to_string())
}