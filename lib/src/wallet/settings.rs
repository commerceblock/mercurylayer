use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

#[allow(non_snake_case)]
#[derive(Debug, Serialize, Deserialize, Clone)]
#[cfg_attr(feature = "bindings", derive(uniffi::Record))]
#[wasm_bindgen]
pub struct Settings {
    network: String,
    block_explorer_url: Option<String>,
    tor_proxy_host: Option<String>,
    tor_proxy_port: Option<String>,
    tor_proxy_control_password: Option<String>,
    tor_proxy_control_port: Option<String>,
    statechain_entity_api: String,
    tor_statechain_entity_api: Option<String>,
    electrum_protocol: String,
    electrum_host: String,
    electrum_port: String,
    electrum_type: String,
    notifications: bool,
    tutorials: bool
}

#[wasm_bindgen]
impl Settings {

    #[wasm_bindgen(constructor)]
    pub fn new(
        network: String,
        block_explorer_url: Option<String>,
        tor_proxy_host: Option<String>,
        tor_proxy_port: Option<String>,
        tor_proxy_control_password: Option<String>,
        tor_proxy_control_port: Option<String>,
        statechain_entity_api: String,
        tor_statechain_entity_api: Option<String>,
        electrum_protocol: String,
        electrum_host: String,
        electrum_port: String,
        electrum_type: String,
        notifications: bool,
        tutorials: bool
    ) -> Self {
        Self {
            network,
            block_explorer_url,
            tor_proxy_host,
            tor_proxy_port,
            tor_proxy_control_password,
            tor_proxy_control_port,
            statechain_entity_api,
            tor_statechain_entity_api,
            electrum_protocol,
            electrum_host,
            electrum_port,
            electrum_type,
            notifications,
            tutorials
        }
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
    pub fn block_explorer_url(&self) -> Option<String> {
        self.block_explorer_url.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_block_explorer_url(&mut self, block_explorer_url: Option<String>) {
        self.block_explorer_url = block_explorer_url;
    }

    #[wasm_bindgen(getter)]
    pub fn tor_proxy_host(&self) -> Option<String> {
        self.tor_proxy_host.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_tor_proxy_host(&mut self, tor_proxy_host: Option<String>) {
        self.tor_proxy_host = tor_proxy_host;
    }

    #[wasm_bindgen(getter)]
    pub fn tor_proxy_port(&self) -> Option<String> {
        self.tor_proxy_port.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_tor_proxy_port(&mut self, tor_proxy_port: Option<String>) {
        self.tor_proxy_port = tor_proxy_port;
    }

    #[wasm_bindgen(getter)]
    pub fn tor_proxy_control_password(&self) -> Option<String> {
        self.tor_proxy_control_password.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_tor_proxy_control_password(&mut self, tor_proxy_control_password: Option<String>) {
        self.tor_proxy_control_password = tor_proxy_control_password;
    }

    #[wasm_bindgen(getter)]
    pub fn tor_proxy_control_port(&self) -> Option<String> {
        self.tor_proxy_control_port.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_tor_proxy_control_port(&mut self, tor_proxy_control_port: Option<String>) {
        self.tor_proxy_control_port = tor_proxy_control_port;
    }

    #[wasm_bindgen(getter)]
    pub fn statechain_entity_api(&self) -> String {
        self.statechain_entity_api.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_statechain_entity_api(&mut self, statechain_entity_api: String) {
        self.statechain_entity_api = statechain_entity_api;
    }

    #[wasm_bindgen(getter)]
    pub fn tor_statechain_entity_api(&self) -> Option<String> {
        self.tor_statechain_entity_api.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_tor_statechain_entity_api(&mut self, tor_statechain_entity_api: Option<String>) {
        self.tor_statechain_entity_api = tor_statechain_entity_api;
    }

    #[wasm_bindgen(getter)]
    pub fn electrum_protocol(&self) -> String {
        self.electrum_protocol.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_electrum_protocol(&mut self, electrum_protocol: String) {
        self.electrum_protocol = electrum_protocol;
    }

    #[wasm_bindgen(getter)]
    pub fn electrum_host(&self) -> String {
        self.electrum_host.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_electrum_host(&mut self, electrum_host: String) {
        self.electrum_host = electrum_host;
    }

    #[wasm_bindgen(getter)]
    pub fn electrum_port(&self) -> String {
        self.electrum_port.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_electrum_port(&mut self, electrum_port: String) {
        self.electrum_port = electrum_port;
    }

    #[wasm_bindgen(getter)]
    pub fn electrum_type(&self) -> String {
        self.electrum_type.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_electrum_type(&mut self, electrum_type: String) {
        self.electrum_type = electrum_type;
    }

    #[wasm_bindgen(getter)]
    pub fn notifications(&self) -> bool {
        self.notifications.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_notifications(&mut self, notifications: bool) {
        self.notifications = notifications;
    }

    #[wasm_bindgen(getter)]
    pub fn tutorials(&self) -> bool {
        self.tutorials.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_tutorials(&mut self, tutorials: bool) {
        self.tutorials = tutorials;
    }
}