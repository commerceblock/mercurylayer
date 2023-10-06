use std::str::FromStr;

use bech32::{Variant, ToBase32};
use bip39::Mnemonic;
use bitcoin::{secp256k1::{ffi::types::AlignedType, Secp256k1, SecretKey, AllPreallocated, PublicKey}, bip32::{ExtendedPrivKey, DerivationPath, ChildNumber}};

pub fn encode_sc_address(user_pubkey: &PublicKey, auth_pubkey: &PublicKey) -> String {

    let hrp = "sc";
    let variant = Variant::Bech32m;

    let mut data = Vec::<u8>::new();
    data.push(0x00); // version
    data.append(&mut user_pubkey.clone().serialize().to_vec());
    data.append(&mut auth_pubkey.clone().serialize().to_vec());

    let encoded = bech32::encode(hrp, data.to_base32(), variant).unwrap();

    encoded
}

fn get_key(secp: &Secp256k1<AllPreallocated<'_>>, root: ExtendedPrivKey, derivation_path: &str, change_index: u32, address_index:u32) -> SecretKey {
    // derive child xpub
    let path = DerivationPath::from_str(derivation_path).unwrap();
    let child = root.derive_priv(&secp, &path).unwrap();

    // generate key at m/change_index_number/address_index_number
    let change_index_number = ChildNumber::from_normal_idx(change_index).unwrap();
    let address_index_number = ChildNumber::from_normal_idx(address_index).unwrap();

    let secret_key = child.derive_priv(&secp, &[change_index_number, address_index_number]).unwrap().private_key;

    secret_key
}

pub fn get_sc_address(mnemonic: &str, index: u32) -> String {

    let network = bitcoin::Network::Testnet;

    // 1. Get the mnemonic from the wallet
    let mnemonic = Mnemonic::parse_normalized(mnemonic).expect("Failed to parse mnemonic");
    
    // 2. Get the seed from the mnemonic
    let seed = mnemonic.to_seed_normalized("");

    // we need secp256k1 context for key derivation
    let mut buf: Vec<AlignedType> = Vec::new();
    buf.resize(Secp256k1::preallocate_size(), AlignedType::zeroed());
    let secp = Secp256k1::preallocated_new(buf.as_mut_slice()).unwrap();

    // calculate root key from seed
    let root = ExtendedPrivKey::new_master(network, &seed).unwrap();

    let user_derivation_path = "m/86h/0h/0h";
    let user_seckey = get_key(&secp, root, &user_derivation_path, 0, index);
    let user_pubkey = user_seckey.public_key(&secp);

    let auth_derivation_path = "m/89h/0h/0h";
    let auth_seckey = get_key(&secp, root, &auth_derivation_path, 0, index);
    let auth_pubkey = auth_seckey.public_key(&secp);

    let sc_address = encode_sc_address(&user_pubkey, &auth_pubkey);

    sc_address
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let mnemonic = String::from("ticket sock try two evidence employ fresh beauty settle general ridge lonely");

        let sc_address = get_sc_address(&mnemonic, 0);
        let expected_sc_address = "sc1qqpgha2armzyvwwglqty24ztegut27neyvlkpu3894adsgascq96tjqr78gy6adlzsre3fqyrxdx8n68henrd6fzcgfwcltu3sesuh05nvxs56pauf";

        assert_eq!(sc_address, expected_sc_address);
    }
}
