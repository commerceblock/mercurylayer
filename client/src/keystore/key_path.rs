use std::collections::HashMap;

use bitcoin::{bip32::{ExtendedPrivKey, ChildNumber}, PublicKey, secp256k1::{All, SecretKey}, PrivateKey};
use curv::elliptic::curves::{ECScalar, secp256_k1::{Secp256k1Scalar, SK}};

use crate::utils::error::CError;

use super::KeyDerivation;

pub struct KeyPath {
    pub last_derived_pos: u32,
    pub ext_priv_key: ExtendedPrivKey,
    pub key_derivation_map: HashMap<PublicKey, KeyDerivation>,
    pub addresses_derivation_map: HashMap<String, PublicKey>,
}

impl KeyPath {
    pub fn new(ext_priv_key: ExtendedPrivKey) -> KeyPath {
        KeyPath {
            last_derived_pos: 0,
            ext_priv_key,
            key_derivation_map: HashMap::new(),
            addresses_derivation_map: HashMap::new()
        }
    }

    pub fn derive_new_key(&mut self, secp: &bitcoin::secp256k1::Secp256k1<All>) -> Result<ExtendedPrivKey, CError> {
        self.ext_priv_key
            .ckd_priv(
                secp,
                ChildNumber::from_hardened_idx(self.last_derived_pos).unwrap(),
            )
            .map_err(|e| CError::from(e))
    }

    /// generate new proof key
    pub fn get_new_key(&mut self) -> Result<PublicKey, CError> {
        let secp = bitcoin::secp256k1::Secp256k1::new();
        let new_ext_priv_key = self.derive_new_key(&secp)?;
        let new_ext_pub_key = new_ext_priv_key.to_priv().public_key(&secp);

        self.last_derived_pos += 1;
        
        self.key_derivation_map.insert(
            new_ext_pub_key,
            KeyDerivation::new(self.last_derived_pos, new_ext_priv_key.to_priv(), None),
        );

        let address = &bitcoin::Address::p2wpkh(
            &new_ext_pub_key,
            self.ext_priv_key.network,
        )?;

        self.addresses_derivation_map.insert(address.to_string(), new_ext_pub_key);

        Ok(new_ext_pub_key)
    }

    /// generate new proof key
    pub fn get_new_key_priv(&mut self) -> Result<(PublicKey, PrivateKey), CError> {
        let secp = bitcoin::secp256k1::Secp256k1::new();
        let new_ext_priv_key = self.derive_new_key(&secp)?;
        let new_ext_pub_key = new_ext_priv_key.to_priv().public_key(&secp);

        self.last_derived_pos += 1;
        self.key_derivation_map.insert(
            new_ext_pub_key,
            KeyDerivation::new(self.last_derived_pos, new_ext_priv_key.to_priv(), None),
        );
        
        let address = &bitcoin::Address::p2wpkh(
            &new_ext_pub_key,
            self.ext_priv_key.network,
        )?;

        self.addresses_derivation_map.insert(address.to_string(), new_ext_pub_key);

        Ok((new_ext_pub_key, new_ext_priv_key.to_priv()))
    }

    fn derive_new_key_encoded_id(
        &mut self,
        secp: &bitcoin::secp256k1::Secp256k1<All>,
        child_id: ChildNumber,
    ) -> Result<ExtendedPrivKey, CError> {
        self.ext_priv_key
            .ckd_priv(secp, child_id)
            .map_err(|e| CError::from(e))
    }

    /// generate new key using BIP-175-style encoding of the funding TxID, and generate o2 if the optional variable is supplied
    pub fn get_new_key_encoded_id(
        &mut self,
        child_id: u32,
        generate_o2: bool,
    ) -> Result<(PublicKey, Option<Secp256k1Scalar>), CError> {
        let secp = bitcoin::secp256k1::Secp256k1::new();

        let new_ext_priv_key =
            self.derive_new_key_encoded_id(&secp, ChildNumber::from_hardened_idx(child_id)?)?;
        let new_ext_pub_key = new_ext_priv_key.to_priv().public_key(&secp);

        self.key_derivation_map.insert(
            new_ext_pub_key,
            KeyDerivation::new(child_id, new_ext_priv_key.to_priv(), None),
        );

        let address = &bitcoin::Address::p2wpkh(
            &new_ext_pub_key,
            self.ext_priv_key.network,
        )?;

        self.addresses_derivation_map.insert(address.to_string(), new_ext_pub_key);

        let o2: Option<Secp256k1Scalar> = match generate_o2 {
            true => {
                let new_ext_priv_key_bytes = new_ext_priv_key.to_priv().inner.secret_bytes();
                let new_ext_priv_sec_key = curv_kzen_secp256k1::SecretKey::from_slice(&new_ext_priv_key_bytes).unwrap();
                let new_sk = SK(new_ext_priv_sec_key);
                Some(Secp256k1Scalar::from_underlying(Some(new_sk)))
            },
            false => None,
        };

        Ok((new_ext_pub_key, o2))
    }

    /// Get corresponding private key for a public key. Return None if key not derived in this path (at least not yet).
    pub fn get_key_derivation(&self, public_key: &PublicKey) -> Option<KeyDerivation> {
        match self.key_derivation_map.get(public_key) {
            Some(entry) => {
                let mut full_derivation = entry.clone();
                full_derivation.public_key = Some(public_key.clone());
                Some(full_derivation)
            }
            None => None,
        }
    }

     /// Get corresponding private key for a public key. Return None if key not derived in this path (at least not yet).
     pub fn get_key_derivation_address(&self, address: &String) -> Option<KeyDerivation> {
        let public_key = match self.addresses_derivation_map.get(address) {
            Some(entry) => {
                entry.clone()
            }
            None => return None,
        };
        match self.key_derivation_map.get(&public_key) {
            Some(entry) => {
                let mut full_derivation = entry.clone();
                full_derivation.public_key = Some(public_key.clone());
                Some(full_derivation)
            }
            None => None,
        }
    }
}
