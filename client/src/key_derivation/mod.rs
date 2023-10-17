mod db;

use std::str::FromStr;

use bip39::{Mnemonic, Language};
use bitcoin::{Network, bip32::{ExtendedPrivKey, DerivationPath, ExtendedPubKey, ChildNumber}, Address};
use secp256k1_zkp::{PublicKey, ffi::types::AlignedType, Secp256k1, SecretKey, XOnlyPublicKey};
use sqlx::Sqlite;
use bech32::{self, FromBase32, Variant};

use crate::error::CError;

pub async fn generate_new_key(pool: &sqlx::Pool<Sqlite>, derivation_path: &str, change_index: u32, address_index:u32, network: Network) -> KeyData {

    let (seed, _) = db::generate_or_get_seed(pool).await;

    // we need secp256k1 context for key derivation
    let mut buf: Vec<AlignedType> = Vec::new();
    buf.resize(Secp256k1::preallocate_size(), AlignedType::zeroed());
    let secp = Secp256k1::preallocated_new(buf.as_mut_slice()).unwrap();

    // calculate root key from seed
    let root = ExtendedPrivKey::new_master(network, &seed).unwrap();

    let fingerprint = root.fingerprint(&secp).to_string();

    // derive child xpub
    let path = DerivationPath::from_str(derivation_path).unwrap();
    let child = root.derive_priv(&secp, &path).unwrap();
    let xpub = ExtendedPubKey::from_priv(&secp, &child);

    // generate first receiving address at m/0/0
    // manually creating indexes this time
    let change_index_number = ChildNumber::from_normal_idx(change_index).unwrap();
    let address_index_number = ChildNumber::from_normal_idx(address_index).unwrap();

    let derivation_path = format!("{}/{}/{}", derivation_path, change_index, address_index );

    let secret_key = child.derive_priv(&secp, &[change_index_number, address_index_number]).unwrap().private_key;
    let public_key: secp256k1_zkp::PublicKey = xpub.derive_pub(&secp, &[change_index_number, address_index_number]).unwrap().public_key;

    KeyData {
        secret_key,
        public_key,
        fingerprint,
        derivation_path,
        change_index,
        address_index,
    }
}

pub struct KeyData {
    pub secret_key: SecretKey,
    pub public_key: PublicKey,
    pub fingerprint: String,
    pub derivation_path: String,
    pub change_index: u32,
    pub address_index: u32,
}

pub async fn get_mnemonic_and_block_height(pool: &sqlx::Pool<Sqlite>) -> (String, u32) {
    let (seed, block_height) = db::generate_or_get_seed(pool).await;

    let mnemonic = Mnemonic::from_entropy_in(Language::English,&seed).unwrap();

    (mnemonic.to_string(), block_height)
}

pub struct AddressData {
    pub client_secret_key: SecretKey,
    pub client_pubkey_share: PublicKey,
    pub auth_secret_key: SecretKey,
    pub auth_xonly_pubkey: XOnlyPublicKey,
    pub backup_address: Address,
    pub transfer_address: String,
}

pub fn decode_transfer_address(sc_address: &str) -> Result<(u8, PublicKey, PublicKey), CError> {
    let (hrp, data, variant)  = bech32::decode(sc_address).unwrap();

    if hrp != "sc" {
        return Err(CError::Generic("Invalid address".to_string()));
    }

    if variant != Variant::Bech32m {
        return Err(CError::Generic("Invalid address".to_string()));
    }

    let decoded_data = Vec::<u8>::from_base32(&data).unwrap();

    let version = decoded_data[0];
    let user_pubkey = PublicKey::from_slice(&decoded_data[1..34]).unwrap();
    let auth_pubkey = PublicKey::from_slice(&decoded_data[34..67]).unwrap();

    Ok((version, user_pubkey, auth_pubkey))
}


pub async fn get_new_address(pool: &sqlx::Pool<Sqlite>, network: Network) -> AddressData {
    let derivation_path = "m/86h/0h/0h";
    let change_index = 0;
    let address_index = db::get_next_address_index(pool, change_index).await;
    let agg_key_data = generate_new_key(pool, derivation_path, change_index, address_index, network).await;

    let client_secret_key = agg_key_data.secret_key;
    let client_pubkey_share = agg_key_data.public_key;
    let backup_address = Address::p2tr(&Secp256k1::new(), client_pubkey_share.x_only_public_key().0, None, network);

    db::insert_agg_key_data(pool, &agg_key_data, &backup_address).await;

    let derivation_path = "m/89h/0h/0h";
    let auth_key_data = generate_new_key(pool, derivation_path, change_index, address_index, network).await;

    assert!(auth_key_data.fingerprint == agg_key_data.fingerprint);
    assert!(auth_key_data.address_index == agg_key_data.address_index);
    assert!(auth_key_data.change_index == agg_key_data.change_index);
    assert!(auth_key_data.derivation_path != agg_key_data.derivation_path);

    let transfer_address = mercury_lib::encode_sc_address(&client_pubkey_share, &auth_key_data.public_key);

    db::update_auth_key_data(pool, &auth_key_data, &client_pubkey_share, &transfer_address).await;

    AddressData {
        client_secret_key,
        client_pubkey_share,
        auth_secret_key: auth_key_data.secret_key,
        auth_xonly_pubkey: auth_key_data.public_key.x_only_public_key().0,
        backup_address,
        transfer_address,
    }
}