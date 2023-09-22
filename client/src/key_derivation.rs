use std::str::FromStr;

use bip39::{Mnemonic, Language};
use bitcoin::{Network, bip32::{ExtendedPrivKey, DerivationPath, ExtendedPubKey, ChildNumber}, Address};
use secp256k1_zkp::{PublicKey, ffi::types::AlignedType, Secp256k1, SecretKey, XOnlyPublicKey};
use sqlx::{Sqlite, Row};
use uuid::Uuid;
use bech32::{self, WriteBase32, FromBase32, ToBase32, Variant};

use crate::error::CError;

async fn generate_or_get_seed(pool: &sqlx::Pool<Sqlite>) -> [u8; 32] {

    let rows = sqlx::query("SELECT * FROM signer_seed")
        .fetch_all(pool)
        .await
        .unwrap();

    if rows.len() > 1 {
        panic!("More than one seed in database");
    }

    if rows.len() == 1 {
        let row = rows.get(0).unwrap();
        let seed = row.get::<Vec<u8>, _>("seed");
        let mut seed_array = [0u8; 32];
        seed_array.copy_from_slice(&seed);
        return seed_array;
    } else {
        let mut seed = [0u8; 32];  // 256 bits
        rand::RngCore::fill_bytes(&mut rand::thread_rng(), &mut seed);
        
        let query = "INSERT INTO signer_seed (seed) VALUES ($1)";
        let _ = sqlx::query(query)
            .bind(seed.to_vec())
            .execute(pool)
            .await
            .unwrap();

        seed
    }   
}

pub async fn get_next_address_index(pool: &sqlx::Pool<Sqlite>, change_index: u32) -> u32 {

    let row = sqlx::query("SELECT MAX(address_index) FROM signer_data WHERE change_index = $1")
        .bind(change_index)
        .fetch_one(pool)
        .await
        .unwrap();

    let index = row.get::<Option<u32>, _>(0);

    if index.is_some() {
        return index.unwrap() + 1;
    } else {
        return 0;
    }
}

pub async fn generate_new_key(pool: &sqlx::Pool<Sqlite>, derivation_path: &str, change_index: u32, address_index:u32, network: Network) -> KeyData {

    let seed = generate_or_get_seed(pool).await;

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
        amount: None,
        token_id: None,
        secret_key,
        public_key,
        fingerprint,
        derivation_path,
        change_index,
        address_index,
    }
}

pub async fn insert_agg_key_data(pool: &sqlx::Pool<Sqlite>, key_data: &KeyData, backup_address: &Address)  {

    let query = 
        "INSERT INTO signer_data (token_id, amount, client_seckey_share, client_pubkey_share, backup_address, fingerprint, agg_key_derivation_path, change_index, address_index) \
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)";

    let token_id_str = match key_data.token_id {
        Some(token_id) => Some(token_id.to_string()),
        None => None,
    };

    let amount = match key_data.amount {
        Some(amount) => Some(amount as i64),
        None => None,
    };

    let _ = sqlx::query(query)
        .bind(token_id_str)
        .bind(amount)
        .bind(&key_data.secret_key.secret_bytes().to_vec())
        .bind(&key_data.public_key.serialize().to_vec())
        .bind(&backup_address.to_string())
        .bind(&key_data.fingerprint)
        .bind(&key_data.derivation_path)
        .bind(key_data.change_index)
        .bind(key_data.address_index)
        .execute(pool)
        .await
        .unwrap();
}

pub async fn update_auth_key_data(pool: &sqlx::Pool<Sqlite>, key_data: &KeyData, client_pubkey_share: &PublicKey, transfer_address: &str)  {

    let query = "\
        UPDATE signer_data \
        SET auth_derivation_path = $1, auth_seckey = $2, auth_pubkey = $3, transfer_address = $4 \
        WHERE client_pubkey_share = $5";

    let _ = sqlx::query(query)
        .bind(&key_data.derivation_path)
        .bind(&key_data.secret_key.secret_bytes().to_vec())
        .bind(&key_data.public_key.serialize().to_vec())
        .bind(transfer_address)
        .bind(&client_pubkey_share.serialize().to_vec())
        .execute(pool)
        .await
        .unwrap();
}

pub struct KeyData {
    pub token_id: Option<Uuid>,
    pub amount: Option<u64>,
    pub secret_key: SecretKey,
    pub public_key: PublicKey,
    pub fingerprint: String,
    pub derivation_path: String,
    pub change_index: u32,
    pub address_index: u32,
}

pub async fn get_mnemonic(pool: &sqlx::Pool<Sqlite>) -> String {
    let seed = generate_or_get_seed(pool).await;

    let mnemonic = Mnemonic::from_entropy_in(Language::English,&seed).unwrap();

    mnemonic.to_string()
}

pub struct AddressData {
    pub client_secret_key: SecretKey,
    pub client_pubkey_share: PublicKey,
    pub auth_secret_key: SecretKey,
    pub auth_xonly_pubkey: XOnlyPublicKey,
    pub backup_address: Address,
    pub transfer_address: String,
}

pub fn encode_transfer_address(user_pubkey: &PublicKey, auth_pubkey: &PublicKey) -> String {

    let hrp = "sc";
    let variant = Variant::Bech32m;

    let mut data = Vec::<u8>::new();
    data.push(0x00); // version
    data.append(&mut user_pubkey.clone().serialize().to_vec());
    data.append(&mut auth_pubkey.clone().serialize().to_vec());

    let encoded = bech32::encode(hrp, data.to_base32(), variant).unwrap();

    encoded
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


pub async fn get_new_address(pool: &sqlx::Pool<Sqlite>, token_id: Option<uuid::Uuid>, amount: Option<u64>, network: Network) -> AddressData {
    let derivation_path = "m/86h/0h/0h";
    let change_index = 0;
    let address_index = get_next_address_index(pool, change_index).await;
    let mut agg_key_data = generate_new_key(pool, derivation_path, change_index, address_index, network).await;
    agg_key_data.token_id = token_id;
    agg_key_data.amount = amount;

    let client_secret_key = agg_key_data.secret_key;
    let client_pubkey_share = agg_key_data.public_key;
    let backup_address = Address::p2tr(&Secp256k1::new(), client_pubkey_share.x_only_public_key().0, None, network);

    insert_agg_key_data(pool, &agg_key_data, &backup_address).await;

    let derivation_path = "m/89h/0h/0h";
    let mut auth_key_data = generate_new_key(pool, derivation_path, change_index, address_index, network).await;
    auth_key_data.token_id = token_id;
    auth_key_data.amount = amount;

    assert!(auth_key_data.fingerprint == agg_key_data.fingerprint);
    assert!(auth_key_data.address_index == agg_key_data.address_index);
    assert!(auth_key_data.change_index == agg_key_data.change_index);
    assert!(auth_key_data.derivation_path != agg_key_data.derivation_path);

    let transfer_address = encode_transfer_address(&client_pubkey_share, &auth_key_data.public_key);

    update_auth_key_data(pool, &auth_key_data, &client_pubkey_share, &transfer_address).await;

    AddressData {
        client_secret_key,
        client_pubkey_share,
        auth_secret_key: auth_key_data.secret_key,
        auth_xonly_pubkey: auth_key_data.public_key.x_only_public_key().0,
        backup_address,
        transfer_address,
    }
}