use std::{fs, str::FromStr};

use bitcoin::{secp256k1::{Secp256k1, SecretKey, Message, All}, bip32::{ExtendedPrivKey, ChildNumber}, Network, Address, TxIn, OutPoint, Witness, hashes::Hash};
use electrum_client::{ElectrumApi, GetBalanceRes, ListUnspentRes};
use serde_json::json;
use shared::structs::Protocol;
use uuid::Uuid;

use crate::{utils::{client_shim::ClientShim, error::{CError, WalletErrorType}, helpers::get_sighash}, keystore::{key_path_with_addresses::KeyPathWithAddresses, key_path::KeyPath}};

use super::shared_key::SharedKey;

/// Standard Bitcoin Wallet
pub struct Wallet {
    pub id: String,
    pub name: String,
    pub network: String,
    
    pub electrum_client: electrum_client::Client,
    pub client_shim: ClientShim,

    secp: Secp256k1<All>,

    pub master_priv_key: ExtendedPrivKey,
    pub keys: KeyPathWithAddresses,           // Keys for general usage
    pub se_proof_keys: KeyPath,               // for use as State Entity proof keys
    pub se_key_shares: KeyPath,               // for derivation of private key shares used in shared_keys

    pub shared_keys: Vec<SharedKey>, // vector of keys co-owned with state entities
    pub require_mainstay: bool,
}

impl Wallet {
    pub fn new(seed: &[u8], name: &str, network: Network, electrum_server_url: &str, statechain_entity_url: &str) -> Wallet {
        let secp = Secp256k1::new();
        let master_priv_key =
            ExtendedPrivKey::new_master(network, seed).unwrap();

        let keys_master_ext_key = master_priv_key
            .ckd_priv(&secp, ChildNumber::from_hardened_idx(0).unwrap())
            .unwrap();
        let keys = KeyPathWithAddresses::new(keys_master_ext_key);

        let se_proof_keys_master_ext_key = master_priv_key
            .ckd_priv(&secp, ChildNumber::from_hardened_idx(2).unwrap())
            .unwrap();
        let se_proof_keys = KeyPath::new(se_proof_keys_master_ext_key);

        let se_key_shares_master_ext_key = master_priv_key
            .ckd_priv(&secp, ChildNumber::from_hardened_idx(3).unwrap())
            .unwrap();
        let se_key_shares = KeyPath::new(se_key_shares_master_ext_key);

        let electrum_client = electrum_client::Client::new(electrum_server_url).unwrap();

        let client_shim = ClientShim::new(statechain_entity_url);

        Wallet {
            id: Uuid::new_v4().to_string(),
            name: name.to_string(),
            network: network.to_string(),
            electrum_client,
            client_shim,
            secp,
            master_priv_key,
            keys,
            se_proof_keys,
            se_key_shares,
            shared_keys: vec![],
            require_mainstay: false,
        }
    }

    /// serialize wallet to json
    pub fn to_json(&self) -> serde_json::Value {
        // get all encoded child indices for KeyPaths used in state entity protocols
        let mut se_proof_keys_pos_encoded = Vec::new();
        for (_, key_derivation) in &self.se_proof_keys.key_derivation_map {
            if key_derivation.pos > self.se_proof_keys.last_derived_pos {
                se_proof_keys_pos_encoded.push(key_derivation.pos);
            }
        }
        let mut se_key_shares_pos_encoded = Vec::new();
        for (_, key_derivation) in &self.se_key_shares.key_derivation_map {
            if key_derivation.pos > self.se_key_shares.last_derived_pos {
                se_key_shares_pos_encoded.push(key_derivation.pos);
            }
        }
        json!({
            "id": self.id,
            "name": self.name,
            "network": self.network,
            "master_priv_key": self.master_priv_key.to_string(),
            "keys_last_derived_pos": self.keys.last_derived_pos,
            "se_proof_keys_last_derivation_pos": self.se_proof_keys.last_derived_pos,
            "se_proof_keys_pos_encoded": serde_json::to_string(&se_proof_keys_pos_encoded).unwrap(),
            "se_key_shares_last_derivation_pos": self.se_key_shares.last_derived_pos,
            "se_key_shares_pos_encoded": serde_json::to_string(&se_key_shares_pos_encoded).unwrap(),
            "shared_keys": serde_json::to_string(&self.shared_keys).unwrap(),
            "require_mainstay": self.require_mainstay
        })
    }

    /// load wallet from json
    pub fn from_json(json: serde_json::Value, electrum_server_url: &str, statechain_entity_url: &str) -> Result<Self, CError> {
        let secp = Secp256k1::new();
        let network = json["network"].as_str().unwrap().to_string();

        // master extended keys
        let mut master_priv_key =
            ExtendedPrivKey::from_str(json["master_priv_key"].as_str().unwrap()).unwrap();
        master_priv_key.network = network.parse::<Network>().unwrap();

        // keys
        let mut keys_master_ext_key = master_priv_key
            .ckd_priv(&secp, ChildNumber::from_hardened_idx(0).unwrap())
            .unwrap();
        keys_master_ext_key.network = network.parse::<Network>().unwrap();
        let keys = KeyPathWithAddresses::new(keys_master_ext_key);

        // se_proof_keys
        let mut se_proof_keys_master_ext_key = master_priv_key
            .ckd_priv(&secp, ChildNumber::from_hardened_idx(2).unwrap())
            .unwrap();
        se_proof_keys_master_ext_key.network = network.parse::<Network>().unwrap();
        let se_proof_keys = KeyPath::new(se_proof_keys_master_ext_key);

        // se_key_shares
        let mut se_key_shares_master_ext_key = master_priv_key
            .ckd_priv(&secp, ChildNumber::from_hardened_idx(3).unwrap())
            .unwrap();
        se_key_shares_master_ext_key.network = network.parse::<Network>().unwrap();
        let se_key_shares = KeyPath::new(se_key_shares_master_ext_key);

        let electrum_client = electrum_client::Client::new(electrum_server_url).unwrap();

        let client_shim = ClientShim::new(statechain_entity_url);

        let mut wallet = Wallet {
            id: json["id"].as_str().unwrap().to_string(),
            name: json["name"].as_str().unwrap().to_string(),
            network,
            electrum_client,
            client_shim,
            master_priv_key,
            secp,
            keys,
            se_proof_keys,
            se_key_shares,
            shared_keys: vec![],
            require_mainstay: json.get("require_mainstay").unwrap().as_bool().unwrap(),
        };

        // re-derive keys which have been previously derived
        for _ in 0..json["keys_last_derived_pos"].as_u64().unwrap() {
            wallet.keys.get_new_address()?;
        }
        for _ in 0..json["se_proof_keys_last_derivation_pos"].as_u64().unwrap() {
            wallet.se_proof_keys.get_new_key()?;
        }
        for _ in 0..json["se_key_shares_last_derivation_pos"].as_u64().unwrap() {
            wallet.se_key_shares.get_new_key()?;
        }

        let se_proof_keys_pos_str = json["se_proof_keys_pos_encoded"].as_str().unwrap();
        if se_proof_keys_pos_str.len() != 2 {
            // is not empty
            let se_proof_keys_pos: Vec<u32> = serde_json::from_str(se_proof_keys_pos_str).unwrap();
            for pos in se_proof_keys_pos {
                wallet.se_proof_keys.get_new_key_encoded_id(pos, false)?;
            }
        }

        let se_key_shares_pos_str = json["se_key_shares_pos_encoded"].as_str().unwrap();
        if se_key_shares_pos_str.len() != 2 {
            // is not empty
            let se_key_shares_pos: Vec<u32> = serde_json::from_str(se_key_shares_pos_str).unwrap();
            for pos in se_key_shares_pos {
                wallet.se_key_shares.get_new_key_encoded_id(pos, false)?;
            }
        }

        let shared_keys_str = &json["shared_keys"].as_str().unwrap();
        if shared_keys_str.len() != 2 {
            // is not empty
            let shared_keys: Vec<SharedKey> = serde_json::from_str(shared_keys_str).unwrap();
            wallet.shared_keys = shared_keys;
        }

        dbg!("(wallet id: {}) Loaded wallet to memory", &wallet.id);
        Ok(wallet)
    }

    /// save to disk
    pub fn save(&self) {

        let home_dir = dirs::home_dir();

        let mut path = home_dir.clone().unwrap();
        path.push(".statechain");
        path.push("wallets");

        std::fs::create_dir_all(path.clone()).unwrap();

        path.push(format!("{}.json", &self.name));

        // let mut file = OpenOptions::new().write(true)
        //                      .create_new(true)
        //                      .open(path).unwrap();
        // file.write_all(self.to_json().to_string().as_bytes()).unwrap();
        // file.sync_all().unwrap();
        fs::write(path, self.to_json().to_string()).expect("Unable to save wallet!");

        dbg!("(wallet id: {}) Saved wallet to disk", &self.id);
    }

    /// load wallet from disk
    pub fn load(wallet_name: &str, electrum_server_url: &str, statechain_entity_url: &str) -> Result<Wallet, CError> {

        let home_dir = dirs::home_dir();

        let mut path = home_dir.clone().unwrap();
        path.push(".statechain");
        path.push("wallets");
        path.push(format!("{}.json", wallet_name));

        // check if file exists
        let data = match fs::read_to_string(path) {
            Ok(data) => data,
            Err(_) => return Err(CError::WalletError(WalletErrorType::WalletFileNotFound))
        };

        // deserialize
        let serde_json_data = match serde_json::from_str(&data) {
            Ok(data) => data,
            Err(_) => return Err(CError::WalletError
                (WalletErrorType::WalletFileInvalid))
        };

        // load wallet
        let wallet: Wallet = match Wallet::from_json(serde_json_data, electrum_server_url, statechain_entity_url) {
            Ok(wallet) => wallet,
            Err(_) => return Err(CError::WalletError(WalletErrorType::WalletFileInvalid))
        };

        dbg!("(wallet id: {}) Loaded wallet to memory", &wallet.id);
        Ok(wallet)
    }

    /// return balance of address
    fn get_address_balance(&mut self, address: &bitcoin::Address) -> GetBalanceRes {
        //let client = electrum_client::Client::new("tcp://electrum.blockstream.info:50001").unwrap();
        // let client = electrum_client::Client::new("127.0.0.1:60401").unwrap();
        self.electrum_client.script_get_balance(&address.script_pubkey()).unwrap()
    }

    fn zero_balance(&self, addr: &GetBalanceRes) -> bool {
        if addr.confirmed == 0 {
            if addr.unconfirmed == 0 {
                return true;
            }
        }
        return false;
    }

    /// return list of all addresses derived from keys in wallet
    fn get_all_wallet_addresses(&self) -> Vec<bitcoin::Address> {
        self.keys.get_all_addresses()
    }

    pub fn get_all_addresses_balance(
        &mut self,
    ) -> Vec<(bitcoin::Address, GetBalanceRes)> {

        let all_addrs = self.get_all_wallet_addresses();

        let all_bals: Vec<GetBalanceRes> = all_addrs
            .clone()
            .into_iter()
            .map(|a| self.get_address_balance(&a))
            .collect();

        // return non-0 balances
        let mut addrs_balance: Vec<(bitcoin::Address, GetBalanceRes)> = vec![];
        for (i, balance) in all_bals.into_iter().enumerate() {
            if !self.zero_balance(&balance) {
                addrs_balance.push((all_addrs.get(i).unwrap().clone(), balance));
            }
        }
        
        addrs_balance
    }

    fn list_unspent_for_address(&mut self, address: &bitcoin::Address) -> Result<Vec<ListUnspentRes>, CError> {

        // let client = electrum_client::Client::new("127.0.0.1:60401").unwrap();
        match self.electrum_client.script_list_unspent(&address.script_pubkey()) {
            Ok(val) => Ok(val),
            Err(e) => Err(CError::Generic(e.to_string())),
        }
    }

    /// List unspent outputs for addresses derived by this wallet.
    pub fn list_unspent(
        &mut self,
    ) -> Result<(Vec<bitcoin::Address>, Vec<Vec<ListUnspentRes>>), CError> {
        let addresses = self.get_all_wallet_addresses();
        let mut unspent_list: Vec<Vec<ListUnspentRes>> = vec![];
        for addr in &addresses {
            let addr_unspent_list = self.list_unspent_for_address(&addr)?;
            unspent_list.push(addr_unspent_list);
        }
        Ok((addresses, unspent_list))
    }

    pub fn get_tip_header(&self) -> Result<usize, CError> {
        match self.electrum_client.block_headers_subscribe() {
            Ok(val) => Ok(val.height),
            Err(e) => Err(CError::Generic(e.to_string())),
        }
    }

    /// Select unspent coins greedily. Return TxIns along with corresponding spending addresses and amounts
    pub fn coin_selection_greedy(
        &mut self,
        amount: &u64,
    ) -> Result<(Vec<TxIn>, Vec<Address>, Vec<u64>), CError> {
        // Greedy coin selection.
        let (unspent_addrs, unspent_utxos) = self.list_unspent()?;
        let mut inputs: Vec<TxIn> = vec![];
        let mut addrs: Vec<Address> = vec![]; // corresponding addresses for inputs
        let mut amounts: Vec<u64> = vec![]; // corresponding amounts for inputs
        for (i, addr) in unspent_addrs.into_iter().enumerate() {
            for unspent_utxo in unspent_utxos.get(i).unwrap() {
                inputs.push(basic_input(
                    &unspent_utxo.tx_hash.to_string(),
                    &(unspent_utxo.tx_pos as u32),
                ));
                addrs.push(addr.clone());
                amounts.push(unspent_utxo.value as u64);
                if *amount <= amounts.iter().sum::<u64>() {
                    return Ok((inputs, addrs, amounts));
                }
            }
        }
        return Err(CError::WalletError(WalletErrorType::NotEnoughFunds));
    }

    /// Sign inputs with given addresses derived by this wallet. input_indices, addresses and amoumts lists
    /// must be in order of appearance in TxIn[] list
    pub fn sign_tx(
        &mut self,
        transaction: &bitcoin::Transaction,
        input_indices: &Vec<usize>,
        addresses: &Vec<bitcoin::Address>,
    ) -> bitcoin::Transaction {
        let mut signed_transaction = transaction.clone();
        for (iter, input_index) in input_indices.iter().enumerate() {
            // get key corresponding to address
            let address = addresses.get(iter).unwrap();
            let key_derivation = self
                .keys
                .get_address_derivation(&address.to_string())
                .ok_or(CError::WalletError(WalletErrorType::KeyNotFound))
                .unwrap();
            let pk = key_derivation.public_key.unwrap();
            let sk = key_derivation.private_key.inner;

            let sig_hash = get_sighash(
                &transaction,
                &input_index,
                &pk,
                &self.network,
            );

            let hash_byte = sig_hash.to_byte_array();

            let msg = Message::from_slice(&hash_byte).unwrap();
            let signature = self.secp.sign_ecdsa(&msg, &sk).serialize_der();

            let mut with_hashtype = signature.to_vec();
            with_hashtype.push(1);
            signed_transaction.input[*input_index].witness.clear();
            signed_transaction.input[*input_index]
                .witness
                .push(with_hashtype);
            signed_transaction.input[*input_index]
                .witness
                .push(pk.inner.serialize().to_vec());
        }
        return signed_transaction;
    }

    // - Shared Keys Section - Start
    
    /// create new 2P-ECDSA key with state entity
    pub fn gen_shared_key_repeat_keygen(&mut self, id: &Uuid, value: &u64, solution: String, kg1_reps: u32) -> Result<&SharedKey, CError> {
        let key_share_pub = self.se_key_shares.get_new_key()?;
        let key_share_priv = self
            .se_key_shares
            .get_key_derivation(&key_share_pub)
            .unwrap()
            .private_key
            .inner;

        let shared_key = SharedKey::new_repeat_keygen(
            id,
            &self.client_shim,
            &key_share_priv,
            value,
            Protocol::Deposit,
            solution,
            kg1_reps
        )?;
        self.shared_keys.push(shared_key);
        Ok(self.shared_keys.last().unwrap())
    }

    /// create new 2P-ECDSA key with state entity
    pub fn gen_shared_key(&mut self, id: &Uuid, value: &u64, solution: String) -> Result<&SharedKey, CError> {
        self.gen_shared_key_repeat_keygen(id, value, solution, 0)
    }

    /// create new 2P-ECDSA key with pre-definfed private key
    pub fn gen_shared_key_fixed_secret_key_repeat_keygen(
        &mut self,
        id: &Uuid,
        secret_key: &SecretKey,
        value: &u64,
        rep_kg1: u32
    ) -> Result<(), CError> {
        self.shared_keys.push(SharedKey::new_repeat_keygen(
            id,
            &self.client_shim,
            secret_key,
            value,
            Protocol::Transfer,
            "".to_string(),
            rep_kg1
        )?);
        Ok(())
    }

    /// Get shared key by id. Return None if no shared key with given id.
    pub fn get_shared_key(&self, id: &Uuid) -> Result<&SharedKey, CError> {
        for shared in &self.shared_keys {
            if shared.id == *id {
                return Ok(shared);
            }
        }
        Err(CError::WalletError(WalletErrorType::SharedKeyNotFound))
    }

    /// Get unspent shared key by state chain id. Return Err if no shared key with given state chain id.
    pub fn get_shared_key_by_statechain_id(&self, statechain_id: &Uuid) -> Result<&SharedKey, CError> {
        for shared in &self.shared_keys {
            if shared.statechain_id == Some(statechain_id.to_owned()) {
                if shared.unspent == true {
                    return Ok(shared);
                } 
            }
        }
        // If not found return shared key marked as spent.
        // This is temporary until we get smarter shared_key.unspent implemented with arrival
        // of watcher to check transfer status of StateChains.
        // At the moment wallet marks shared_keys as spent when transfer_sender() completes so we
        // cannot test for 'StateChain locked/spent' error messages without below code
        for shared in &self.shared_keys {
            if shared.statechain_id == Some(statechain_id.to_owned()) {
                return Ok(shared);
            }
        }
        Err(CError::WalletError(WalletErrorType::StateChainNotFound))
    }

    /// Get mutable reference to shared key by id. Return None if no shared key with given id.
    pub fn get_shared_key_mut(&mut self, id: &Uuid) -> Result<&mut SharedKey, CError> {
        for shared in &mut self.shared_keys {
            if shared.id == *id {
                return Ok(shared);
            }
        }
        Err(CError::WalletError(WalletErrorType::SharedKeyNotFound))
    }

    // - Shared Keys Section - End

    // - Utils Section - Start

    pub fn get_bitcoin_network(&self) -> Network {
        self.network.parse::<Network>().unwrap()
    }

    // - Utils Section - End
}

impl std::fmt::Display for Wallet {
    fn fmt(&self, fmt: &mut std::fmt::Formatter<'_>) -> Result<(), std::fmt::Error> {
        write!(fmt, "wallet: {}", self.to_json().to_string())
    }
}

fn basic_input(txid: &String, vout: &u32) -> TxIn {
    TxIn {
        previous_output: OutPoint {
            txid: bitcoin::Txid::from_str(txid).unwrap(),
            vout: *vout,
        },
        sequence: bitcoin::Sequence(0xFFFFFFFF),
        witness: Witness::new(),
        script_sig: bitcoin::Script::empty().into(),
    }
}