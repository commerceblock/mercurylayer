use std::{collections::HashMap, str::FromStr};

use bitcoin::{bip32::{ExtendedPrivKey, ChildNumber, ExtendedPubKey}, secp256k1::{Secp256k1, All}, PublicKey, PrivateKey};

use crate::utils::error::CError;

use super::KeyDerivation;

pub struct KeyPathWithAddresses {
    pub ext_priv_key: ExtendedPrivKey,
    pub last_derived_pos: u32,
    pub addresses_derivation_map: HashMap<String, KeyDerivation>,
}

impl KeyPathWithAddresses {
    pub fn new(ext_priv_key: ExtendedPrivKey) -> KeyPathWithAddresses {
        KeyPathWithAddresses {
            ext_priv_key,
            last_derived_pos: 0,
            addresses_derivation_map: HashMap::new(),
        }
    }

    pub fn derive_new_key(&mut self, secp: &Secp256k1<All>) -> Result<ExtendedPrivKey, CError> {
        self.ext_priv_key
            .ckd_priv(
                secp,
                ChildNumber::from_hardened_idx(self.last_derived_pos).unwrap(),
            )
            .map_err(|e| CError::from(e))
    }

    /// generate new bitcoin address
    pub fn get_new_address(&mut self) -> Result<(bitcoin::Address, u32), CError> {
        let secp = Secp256k1::new();
        let new_ext_priv_key = self.derive_new_key(&secp)?;
        let new_ext_pub_key = new_ext_priv_key.to_priv().public_key(&secp);

        let address = bitcoin::Address::p2wpkh(
            &new_ext_pub_key,
            self.ext_priv_key.network,
        )?;

        self.last_derived_pos += 1;

        self.addresses_derivation_map.insert(
            address.to_string(),
            KeyDerivation::new(
                self.last_derived_pos,
                new_ext_priv_key.to_priv(),
                Some(new_ext_pub_key),
            ),
        );

        Ok((address, self.last_derived_pos))
    }

    // add pubkey to address derivation map
    pub fn add_address(&mut self, new_pubkey: PublicKey, new_privkey: PrivateKey) -> Result<bitcoin::Address, CError> {

        let address = bitcoin::Address::p2wpkh(
            &new_pubkey,
            self.ext_priv_key.network,
        )?;

        self.last_derived_pos += 1;

        self.addresses_derivation_map.insert(
            address.clone().to_string(),
            KeyDerivation::new(
                self.last_derived_pos,
                new_privkey,
                Some(new_pubkey),
            ),
        );

        Ok(address)
    }

    fn derive_new_key_encoded_id(
        &mut self,
        secp: &Secp256k1<All>,
        child_id: ChildNumber,
    ) -> Result<ExtendedPrivKey, CError> {
        self.ext_priv_key
            .ckd_priv(secp, child_id)
            .map_err(|e| CError::from(e))
    }

    /// generate new key using BIP-175-style encoding of the funding TxID
    pub fn get_new_address_encoded_id(&mut self, child_id: u32) -> Result<bitcoin::Address, CError> {
        let secp = Secp256k1::new();

        let new_ext_priv_key =
            self.derive_new_key_encoded_id(&secp, ChildNumber::from_hardened_idx(child_id)?)?;
        let new_ext_pub_key = ExtendedPubKey::from_priv(&secp, &new_ext_priv_key);
        let new_ext_pub_key = new_ext_priv_key.to_priv().public_key(&secp);

        let address = bitcoin::Address::p2wpkh(
            &new_ext_pub_key,
            self.ext_priv_key.network,
        )?;

        self.addresses_derivation_map.insert(
            address.to_string(),
            KeyDerivation::new(
                child_id,
                new_ext_priv_key.to_priv(),
                Some(new_ext_pub_key),
            ),
        );

        Ok(address)
    }

    /// Get address derivation information. Return None if address not derived in this key path (at least not yet).
    pub fn get_address_derivation(&self, address: &String) -> Option<KeyDerivation> {
        match self.addresses_derivation_map.get(address) {
            Some(entry) => Some(*entry),
            None => None,
        }
    }

    /// Get pubkey derivation information
    pub fn get_pubkey_derivation(&self, pubkey: &bitcoin::PublicKey) -> Result<Option<KeyDerivation>, CError> {
        let address = &bitcoin::Address::p2wpkh(
            &pubkey,
            self.ext_priv_key.network,
        )?;
        Ok(
            match self.addresses_derivation_map.get(&address.to_string()) {
            Some(entry) => Some(*entry),
            None => None,
        })
    }

    /// Return all addresses derived by this parent key.
    pub fn get_all_addresses(&self) -> Vec<bitcoin::Address> {
        let mut addrs = Vec::new();
        for (addr, _) in &self.addresses_derivation_map {
            addrs.push(bitcoin::Address::from_str(&addr).unwrap().assume_checked());
        }
        addrs
    }
}