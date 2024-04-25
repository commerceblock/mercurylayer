pub mod transfer;
pub mod deposit;
pub mod withdraw;
pub mod wallet;
pub mod utils;
pub mod transaction;

use std::str::FromStr;

use bech32::{Variant, ToBase32, FromBase32};
use bip39::Mnemonic;
use bitcoin::{bip32::{ChildNumber, DerivationPath, ExtendedPrivKey}, secp256k1::{ffi::types::AlignedType, AllPreallocated, PublicKey, Secp256k1, SecretKey}};

use anyhow::{Result, anyhow};

const MAINNET_HRP : &str = "ml";
const TESTNET_HRP : &str = "tml";

pub fn encode_sc_address(user_pubkey: &PublicKey, auth_pubkey: &PublicKey, network: bitcoin::Network) -> Result<String> {

    let mut hrp = TESTNET_HRP;

    if network == bitcoin::Network::Bitcoin {
        hrp = MAINNET_HRP;
    }
        
    let variant = Variant::Bech32m;

    let mut data = Vec::<u8>::new();
    data.push(0x00); // version
    data.append(&mut user_pubkey.clone().serialize().to_vec());
    data.append(&mut auth_pubkey.clone().serialize().to_vec());

    let encoded = bech32::encode(hrp, data.to_base32(), variant)?;

    Ok(encoded)
}

pub fn decode_transfer_address(sc_address: &str) -> Result<(u8, PublicKey, PublicKey)> {
    let (hrp, data, variant)  = bech32::decode(sc_address)?;

    if hrp != MAINNET_HRP && hrp != TESTNET_HRP {
        return Err(anyhow!("Invalid SC address".to_string()));
    }

    if variant != Variant::Bech32m {
        return Err(anyhow!("Invalid address".to_string()));
    }

    let decoded_data = Vec::<u8>::from_base32(&data)?;

    let version = decoded_data[0];
    let user_pubkey = PublicKey::from_slice(&decoded_data[1..34])?;
    let auth_pubkey = PublicKey::from_slice(&decoded_data[34..67])?;

    Ok((version, user_pubkey, auth_pubkey))
}

fn get_key(secp: &Secp256k1<AllPreallocated<'_>>, root: ExtendedPrivKey, derivation_path: &str, change_index: u32, address_index:u32) -> Result<SecretKey> {
    // derive child xpub
    let path = DerivationPath::from_str(derivation_path)?;
    let child = root.derive_priv(&secp, &path)?;

    // generate key at m/change_index_number/address_index_number
    let change_index_number = ChildNumber::from_normal_idx(change_index)?;
    let address_index_number = ChildNumber::from_normal_idx(address_index)?;

    let secret_key = child.derive_priv(&secp, &[change_index_number, address_index_number])?.private_key;

    Ok(secret_key)
}

pub fn get_sc_address(mnemonic: &str, index: u32, network: &str) -> Result<String> {

    let network = utils::get_network(network)?;

    // 1. Get the mnemonic from the wallet
    let mnemonic = Mnemonic::parse_normalized(mnemonic)?;
    
    // 2. Get the seed from the mnemonic
    let seed = mnemonic.to_seed_normalized("");

    // we need secp256k1 context for key derivation
    let mut buf: Vec<AlignedType> = Vec::new();
    buf.resize(Secp256k1::preallocate_size(), AlignedType::zeroed());
    let secp = Secp256k1::preallocated_new(buf.as_mut_slice())?;

    // calculate root key from seed
    let root = ExtendedPrivKey::new_master(network, &seed)?;

    let user_derivation_path = "m/86h/0h/0h";
    let user_seckey = get_key(&secp, root, &user_derivation_path, 0, index)?;
    let user_pubkey = user_seckey.public_key(&secp);

    let auth_derivation_path = "m/89h/0h/0h";
    let auth_seckey = get_key(&secp, root, &auth_derivation_path, 0, index)?;
    let auth_pubkey = auth_seckey.public_key(&secp);

    encode_sc_address(&user_pubkey, &auth_pubkey, network)
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let mnemonic = String::from("ticket sock try two evidence employ fresh beauty settle general ridge lonely");

        let network = "testnet";
        let sc_address = get_sc_address(&mnemonic, 0, network).unwrap();
        let expected_sc_address = "tml1qqpgha2armzyvwwglqty24ztegut27neyvlkpu3894adsgascq96tjqr78gy6adlzsre3fqyrxdx8n68henrd6fzcgfwcltu3sesuh05nvxslxjnxw";
        assert_eq!(sc_address, expected_sc_address);
       
        let network = "mainnet";
        let sc_address = get_sc_address(&mnemonic, 0, network).unwrap();
        let expected_sc_address = "ml1qqpgha2armzyvwwglqty24ztegut27neyvlkpu3894adsgascq96tjqr78gy6adlzsre3fqyrxdx8n68henrd6fzcgfwcltu3sesuh05nvxs2dd888";
        assert_eq!(sc_address, expected_sc_address);
    }
}
