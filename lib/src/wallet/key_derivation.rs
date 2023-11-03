use std::str::FromStr;
use anyhow::Result;

use bip39::Mnemonic;
use bitcoin::{bip32::{ExtendedPrivKey, DerivationPath, ExtendedPubKey, ChildNumber}, Address, PrivateKey};
use secp256k1_zkp::{SecretKey, PublicKey, ffi::types::AlignedType, Secp256k1};

use crate::{wallet::{Wallet, Coin}, encode_sc_address, utils::get_network};

pub struct KeyData {
    pub secret_key: SecretKey,
    pub public_key: PublicKey,
    pub fingerprint: String,
    pub derivation_path: String,
    pub change_index: u32,
    pub address_index: u32,
}

impl Wallet {

    fn get_seed(&self) -> Result<[u8; 64]> {
        let seed: [u8; 64] = Mnemonic::from_str(&self.mnemonic)?.to_seed("");
        Ok(seed)
    }

    pub fn get_next_address_index(&self) -> u32 {

        let max_index = self.coins.iter().map(|coin| coin.index).max();

        match max_index {
            Some(index) => index + 1,
            None => 0, // Vector is empty
        }
    }

    pub fn generate_new_key(&self, derivation_path: &str, change_index: u32, address_index:u32) -> Result<KeyData> {

        let seed= self.get_seed()?;
        let network = get_network(&self.network)?;

        // we need secp256k1 context for key derivation
        let mut buf: Vec<AlignedType> = Vec::new();
        buf.resize(Secp256k1::preallocate_size(), AlignedType::zeroed());
        let secp = Secp256k1::preallocated_new(buf.as_mut_slice())?;

        // calculate root key from seed
        let root = ExtendedPrivKey::new_master(network, &seed)?;

        let fingerprint = root.fingerprint(&secp).to_string();

        // derive child xpub
        let path = DerivationPath::from_str(derivation_path)?;
        let child = root.derive_priv(&secp, &path)?;
        let xpub = ExtendedPubKey::from_priv(&secp, &child);

        let change_index_number = ChildNumber::from_normal_idx(change_index)?;
        let address_index_number = ChildNumber::from_normal_idx(address_index)?;

        let derivation_path = format!("{}/{}/{}", derivation_path, change_index, address_index );

        let secret_key = child.derive_priv(&secp, &[change_index_number, address_index_number])?.private_key;
        let public_key: secp256k1_zkp::PublicKey = xpub.derive_pub(&secp, &[change_index_number, address_index_number])?.public_key;

        Ok(KeyData {
            secret_key,
            public_key,
            fingerprint,
            derivation_path,
            change_index,
            address_index,
        })
    }

    pub fn get_new_coin(&self) -> Result<Coin> {

        let network = get_network(&self.network)?;

        let derivation_path = "m/86h/0h/0h";
        let change_index = 0;
        let address_index = self.get_next_address_index();

        let agg_key_data = self.generate_new_key(derivation_path, change_index, address_index)?;

        let client_secret_key = agg_key_data.secret_key;
        let client_pubkey_share = agg_key_data.public_key;
        let backup_address = Address::p2tr(&Secp256k1::new(), client_pubkey_share.x_only_public_key().0, None, network);

        let derivation_path = "m/89h/0h/0h";
        let auth_key_data = self.generate_new_key(derivation_path, change_index, address_index)?;

        assert!(auth_key_data.fingerprint == agg_key_data.fingerprint);
        assert!(auth_key_data.address_index == agg_key_data.address_index);
        assert!(auth_key_data.change_index == agg_key_data.change_index);
        assert!(auth_key_data.derivation_path != agg_key_data.derivation_path);

        let auth_secret = auth_key_data.secret_key;

        let client_secret_key_wif = PrivateKey::from_slice(&client_secret_key.secret_bytes(), network)?.to_wif();
        let auth_secret_wif = PrivateKey::from_slice(&auth_secret.secret_bytes(), network)?.to_wif();

        let secp = Secp256k1::new();

        let user_pubkey = client_secret_key.public_key(&secp).to_string();
        let auth_pubkey = auth_secret.public_key(&secp).to_string();

        let coin_address = encode_sc_address(&client_pubkey_share, &auth_key_data.public_key);

        let coin = Coin {
            index: address_index,
            user_privkey: client_secret_key_wif,
            user_pubkey,
            auth_privkey: auth_secret_wif,
            auth_pubkey,
            address:coin_address,
            backup_address: backup_address.to_string(),
            server_pubkey: None,
            aggregated_pubkey: None,
            aggregated_address: None,
            utxo_txid: None,
            utxo_vout: None,
            amount: None,
            statechain_id: None,
            signed_statechain_id: None,
            locktime: None,
            secret_nonce: None,
            public_nonce: None,
            blinding_factor: None,
            server_public_nonce: None,
            status: "INITIALISED".to_string() // CoinStatus::INITIALISED,
        };

        Ok(coin)
    }
}