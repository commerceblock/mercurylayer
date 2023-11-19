#![allow(non_snake_case)]

mod utils;

use std::str::FromStr;

use mercury_lib::{wallet::{Wallet, Token, Coin, Activity, BackupTx, CoinStatus}, utils::ServerConfig, deposit::DepositMsg1Response, transaction::get_partial_sig_request, transfer::{sender::create_transfer_signature, receiver::{decrypt_transfer_msg, TxOutpoint, StatechainInfo, StatechainInfoResponsePayload, create_transfer_receiver_request_payload, get_new_key_info}, TransferMsg}, decode_transfer_address};
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use bip39::Mnemonic;
use rand::Rng;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

#[derive(Serialize, Deserialize)]
pub struct DepositMsg2 {
    statechain_id: String,
    enclave_pubkey: String,
}

#[derive(Serialize, Deserialize)]
pub struct DepositMsg3 {
    r2_commitment: String,
    blind_commitment: String,
    statechain_id: String,
    auth_sig: String,
}

#[derive(Serialize, Deserialize)]
pub struct DepositMsg4 {
    r1_public: String,
    statechain_id: String,
}

#[derive(Serialize, Deserialize)]
pub struct DepositMsg5 {
    statechain_id: String,
    challenge: String,
    auth_sig: String,
}

#[derive(Serialize, Deserialize)]
pub struct DepositMsg6 {
    partial_sig: String,
}

#[wasm_bindgen]
pub fn setConfig(config_json: JsValue, wallet_json: JsValue) -> JsValue {
    let mut wallet: Wallet = serde_wasm_bindgen::from_value(wallet_json).unwrap();
    let config: ServerConfig = serde_wasm_bindgen::from_value(config_json).unwrap();

    mercury_lib::wallet::set_config(&mut wallet, &config);

    serde_wasm_bindgen::to_value(&wallet).unwrap()
}

#[wasm_bindgen]
pub fn setBlockheight(blockheight: u32, wallet_json: JsValue) -> JsValue {
    let mut wallet: Wallet = serde_wasm_bindgen::from_value(wallet_json).unwrap();
    wallet.blockheight = blockheight;
    serde_wasm_bindgen::to_value(&wallet).unwrap()
}

#[wasm_bindgen]
pub fn addToken(token_json: JsValue, wallet_json: JsValue) -> JsValue {
    let mut wallet: Wallet = serde_wasm_bindgen::from_value(wallet_json).unwrap();
    let token: Token = serde_wasm_bindgen::from_value(token_json).unwrap();
    wallet.tokens.push(token);
    serde_wasm_bindgen::to_value(&wallet).unwrap()
}

#[wasm_bindgen]
pub fn confirmToken(token_id: String, wallet_json: JsValue) -> JsValue {
    let mut wallet: Wallet = serde_wasm_bindgen::from_value(wallet_json).unwrap();
    for token in wallet.tokens.iter_mut() {
        if token.token_id == token_id {
            token.confirmed = true;
        }
    }
    serde_wasm_bindgen::to_value(&wallet).unwrap()
}

#[wasm_bindgen]
pub fn getTokens(wallet_json: JsValue) -> JsValue {
    let wallet: Wallet = serde_wasm_bindgen::from_value(wallet_json).unwrap();
    serde_wasm_bindgen::to_value(&wallet.tokens).unwrap()
}

#[wasm_bindgen]
pub fn getBalance(wallet_json: JsValue) -> u32 {
    let wallet: Wallet = serde_wasm_bindgen::from_value(wallet_json).unwrap();
    let mut balance = 0;
    for coin in wallet.coins.iter() {
        balance += coin.amount.unwrap();
    }
    balance
}

#[wasm_bindgen]
pub fn getSCAddress(wallet_json: JsValue, index: u32) -> String {
    let wallet: Wallet = serde_wasm_bindgen::from_value(wallet_json).unwrap();
    let address = mercury_lib::get_sc_address(&wallet.mnemonic, index);
    address.to_string()
}

#[wasm_bindgen]
pub fn generateMnemonic() -> String {
    let mut rng = rand::thread_rng();
    let entropy = (0..16).map(|_| rng.gen::<u8>()).collect::<Vec<u8>>(); // 16 bytes of entropy for 12 words
    let mnemonic = Mnemonic::from_entropy(&entropy).unwrap();
    mnemonic.to_string()
}

#[wasm_bindgen]
pub fn fromMnemonic(name: String, mnemonic: String) -> JsValue {
    let mut wallet = Wallet {
        name: name,
        mnemonic: mnemonic,
        version: String::from("0.1.0"),
        state_entity_endpoint: String::from(""),
        electrum_endpoint: String::from(""),
        network: String::from("testnet"),
        blockheight: 0,
        initlock: 100000,
        interval: 10,
        tokens: Vec::new(),
        activities: Vec::new(),
        coins: Vec::new()
    };
    serde_wasm_bindgen::to_value(&wallet).unwrap()
}

#[wasm_bindgen]
pub fn getActivityLog(wallet_json: JsValue) -> JsValue {
    let wallet: Wallet = serde_wasm_bindgen::from_value(wallet_json).unwrap();
    serde_wasm_bindgen::to_value(&wallet.activities).unwrap()
}

#[wasm_bindgen]
pub fn getCoins(wallet_json: JsValue) -> JsValue {
    let wallet: Wallet = serde_wasm_bindgen::from_value(wallet_json).unwrap();
    serde_wasm_bindgen::to_value(&wallet.coins).unwrap()
}

#[wasm_bindgen]
pub fn getNewCoin(wallet_json: JsValue) -> JsValue {
    let wallet: Wallet = serde_wasm_bindgen::from_value(wallet_json).unwrap();
    let coin = wallet.get_new_coin().unwrap();
    serde_wasm_bindgen::to_value(&coin).unwrap()
}

#[wasm_bindgen]
pub fn createDepositMsg1(coin_json: JsValue, token_id: String, amount: u32) -> JsValue {
    let coin: Coin = serde_wasm_bindgen::from_value(coin_json).unwrap();
    let deposit_msg_1 = mercury_lib::deposit::create_deposit_msg1(&coin, &token_id, amount).unwrap();
    serde_wasm_bindgen::to_value(&deposit_msg_1).unwrap()
}

#[wasm_bindgen]
pub fn handleDepositMsg1Response(coin_json: JsValue, deposit_msg_1_response_json: JsValue) -> JsValue {
    let coin: Coin = serde_wasm_bindgen::from_value(coin_json).unwrap();
    let deposit_msg_1_response: DepositMsg1Response = serde_wasm_bindgen::from_value(deposit_msg_1_response_json).unwrap();
    let deposit_init_result = mercury_lib::deposit::handle_deposit_msg_1_response(&coin, &deposit_msg_1_response).unwrap();
    serde_wasm_bindgen::to_value(&deposit_init_result).unwrap()
}

#[wasm_bindgen]
pub fn createAggregatedAddress(coin_json: JsValue, network: String) -> JsValue {
    let coin: Coin = serde_wasm_bindgen::from_value(coin_json).unwrap();
    let aggregated_public_key = mercury_lib::deposit::create_aggregated_address(&coin, network).unwrap();
    serde_wasm_bindgen::to_value(&aggregated_public_key).unwrap()
}

#[wasm_bindgen]
pub fn createAndCommitNonces(coin_json: JsValue) -> JsValue {
    let coin: Coin = serde_wasm_bindgen::from_value(coin_json).unwrap();
    let coin_nonce = mercury_lib::transaction::create_and_commit_nonces(&coin).unwrap();
    serde_wasm_bindgen::to_value(&coin_nonce).unwrap()
}

#[wasm_bindgen]
pub fn getUserBackupAddress(coin_json: JsValue, network: String) -> String {
    let coin: Coin = serde_wasm_bindgen::from_value(coin_json).unwrap();
    let backup_address = mercury_lib::transaction::get_user_backup_address(&coin, network).unwrap();
    backup_address
}

#[wasm_bindgen]
pub fn getPartialSigRequest(
    coin_json: JsValue, 
    block_height: u32, 
    initlock: u32, 
    interval: u32, 
    fee_rate_sats_per_byte: u32,
    qt_backup_tx: u32,
    to_address: String,
    network: String,
    is_withdrawal: bool) -> JsValue
{
    let coin: Coin = serde_wasm_bindgen::from_value(coin_json).unwrap();

    let partial_sig_request = mercury_lib::transaction::get_partial_sig_request(
        &coin, 
        block_height, 
        initlock, 
        interval, 
        fee_rate_sats_per_byte,
        qt_backup_tx,
        to_address,
        network,
        is_withdrawal).unwrap();

    serde_wasm_bindgen::to_value(&partial_sig_request).unwrap()
}

#[wasm_bindgen]
pub fn createSignature(
    msg: String,
    client_partial_sig_hex: String,
    server_partial_sig_hex: String,
    session_hex: String,
    output_pubkey_hex: String) -> String
{
    let signature = mercury_lib::transaction::create_signature(msg, client_partial_sig_hex, server_partial_sig_hex, session_hex, output_pubkey_hex).unwrap();
    signature
}

#[wasm_bindgen]
pub fn newBackupTransaction(encoded_unsigned_tx: String, signature_hex: String) -> String
{
    let backup_tx = mercury_lib::transaction::new_backup_transaction(encoded_unsigned_tx, signature_hex).unwrap();
    backup_tx
}

#[wasm_bindgen]
pub fn createCpfpTx(backup_tx_json: JsValue, coin_json: JsValue, to_address: String, fee_rate_sats_per_byte: u32, network: String) -> String {
    let coin: Coin = serde_wasm_bindgen::from_value(coin_json).unwrap();
    let backup_tx: BackupTx = serde_wasm_bindgen::from_value(backup_tx_json).unwrap();

    let backup_tx = mercury_lib::wallet::cpfp_tx::create(&backup_tx, &coin, &to_address, fee_rate_sats_per_byte as u64, &network).unwrap();
    backup_tx
    // "".to_string()
}

#[wasm_bindgen]
pub fn createTransferSignature(recipient_address: String, input_txid: String, input_vout: u32, client_seckey: String) -> String {
    let signature = create_transfer_signature(&recipient_address, &input_txid, input_vout, &client_seckey).unwrap();
    signature
}

#[wasm_bindgen]
pub fn createTransferUpdateMsg(x1: String, recipient_address: String, coin_json: JsValue, transfer_signature: String, backup_transactions: JsValue) -> JsValue {
    let coin: Coin = serde_wasm_bindgen::from_value(coin_json).unwrap();
    let backup_transactions: Vec<BackupTx> = serde_wasm_bindgen::from_value(backup_transactions).unwrap();

    let transfer_update_msg_request_payload = mercury_lib::transfer::sender::create_transfer_update_msg(&x1, &recipient_address, &coin, &transfer_signature, &backup_transactions).unwrap();

    serde_wasm_bindgen::to_value(&transfer_update_msg_request_payload).unwrap()
}

#[wasm_bindgen]
pub fn decodeTransferAddress(sc_address: String) -> JsValue {
    
    let (version, user_pubkey, auth_pubkey) = decode_transfer_address(&sc_address).unwrap();

    #[derive(Serialize, Deserialize)]
    struct DecodedSCAddress {
        version: u8,
        user_pubkey: String,
        auth_pubkey: String,
    }

    let decoded_sc_address = DecodedSCAddress {
        version,
        user_pubkey: user_pubkey.to_string(),
        auth_pubkey: auth_pubkey.to_string(),
    };

    serde_wasm_bindgen::to_value(&decoded_sc_address).unwrap()
}

#[wasm_bindgen]
pub fn decryptTransferMsg(encrypted_message: String, private_key_wif: String) -> JsValue {
    let transfer_msg = decrypt_transfer_msg(&encrypted_message, &private_key_wif).unwrap();
    serde_wasm_bindgen::to_value(&transfer_msg).unwrap()
}

#[wasm_bindgen]
pub fn getTx0Outpoint(backup_transactions: JsValue) -> JsValue {
    let backup_transactions: Vec<BackupTx> = serde_wasm_bindgen::from_value(backup_transactions).unwrap();
    let tx0_outpoint = mercury_lib::transfer::receiver::get_tx0_outpoint(&backup_transactions).unwrap();
    serde_wasm_bindgen::to_value(&tx0_outpoint).unwrap()
}

#[wasm_bindgen]
pub fn verifyTransferSignature(new_user_pubkey: String, tx0_outpoint: JsValue, transfer_msg: JsValue) -> bool {
    let tx0_outpoint: TxOutpoint = serde_wasm_bindgen::from_value(tx0_outpoint).unwrap();
    let transfer_msg: TransferMsg = serde_wasm_bindgen::from_value(transfer_msg).unwrap();
    let result = mercury_lib::transfer::receiver::verify_transfer_signature(&new_user_pubkey, &tx0_outpoint, &transfer_msg).unwrap();
    result
}

#[wasm_bindgen]
pub fn validateTx0OutputPubkey(enclave_public_key: String, transfer_msg: JsValue, tx0_outpoint: JsValue, tx0_hex: String, network: String) -> bool {
    let tx0_outpoint: TxOutpoint = serde_wasm_bindgen::from_value(tx0_outpoint).unwrap();
    let transfer_msg: TransferMsg = serde_wasm_bindgen::from_value(transfer_msg).unwrap();
    let result = mercury_lib::transfer::receiver::validate_tx0_output_pubkey(&enclave_public_key, &transfer_msg, &tx0_outpoint, &tx0_hex, &network).unwrap();
    result
}

#[wasm_bindgen]
pub fn verifyLatestBackupTxPaysToUserPubkey(transfer_msg: JsValue, client_pubkey_share: String, network: String) -> bool {
    let transfer_msg: TransferMsg = serde_wasm_bindgen::from_value(transfer_msg).unwrap();
    let result = mercury_lib::transfer::receiver::verify_latest_backup_tx_pays_to_user_pubkey(&transfer_msg, &client_pubkey_share, &network).unwrap();
    result
}

#[wasm_bindgen]
pub fn getOutputAddressFromTx0(tx0_outpoint: JsValue, tx0_hex: String, network: String) -> String {
    let tx0_outpoint: TxOutpoint = serde_wasm_bindgen::from_value(tx0_outpoint).unwrap();
    let output_address = mercury_lib::transfer::receiver::get_output_address_from_tx0(&tx0_outpoint, &tx0_hex, &network).unwrap();
    output_address
}

#[wasm_bindgen]
pub fn verifyTransactionSignature(tx_n_hex: String, tx0_hex: String, fee_rate_tolerance: u32, current_fee_rate_sats_per_byte: u32) -> JsValue {
    let result = mercury_lib::transfer::receiver::verify_transaction_signature(&tx_n_hex, &tx0_hex, fee_rate_tolerance, current_fee_rate_sats_per_byte);

    #[derive(Serialize, Deserialize)]
    struct ValidationResult {
        result: bool,
        msg: Option<String>,
    }

    let mut validation_result = ValidationResult {
        result: result.is_ok(),
        msg: None
    };

    if result.is_err() {
        validation_result.msg = Some(result.err().unwrap().to_string());
    }

    serde_wasm_bindgen::to_value(&validation_result).unwrap()
    
}

#[wasm_bindgen]
pub fn verifyBlindedMusigScheme(backup_tx: JsValue, tx0_hex: String, statechain_info: JsValue) -> JsValue {
    let backup_tx: BackupTx = serde_wasm_bindgen::from_value(backup_tx).unwrap();
    let statechain_info: StatechainInfo = serde_wasm_bindgen::from_value(statechain_info).unwrap();

    let result = mercury_lib::transfer::receiver::verify_blinded_musig_scheme(&backup_tx, &tx0_hex, &statechain_info);
    #[derive(Serialize, Deserialize)]
    struct ValidationResult {
        result: bool,
        msg: Option<String>,
    }

    let mut validation_result = ValidationResult {
        result: result.is_ok(),
        msg: None
    };

    if result.is_err() {
        validation_result.msg = Some(result.err().unwrap().to_string());
    }

    serde_wasm_bindgen::to_value(&validation_result).unwrap()
}

#[wasm_bindgen]
pub fn getBlockheight(backup_tx: JsValue) -> u32 {
    let backup_tx: BackupTx = serde_wasm_bindgen::from_value(backup_tx).unwrap();
    let blockheight = mercury_lib::utils::get_blockheight(&backup_tx).unwrap();
    blockheight
}

#[wasm_bindgen]
pub fn createTransferReceiverRequestPayload(statechain_info: JsValue, transfer_msg: JsValue, coin: JsValue) -> JsValue {
    let statechain_info: StatechainInfoResponsePayload = serde_wasm_bindgen::from_value(statechain_info).unwrap();
    let transfer_msg: TransferMsg = serde_wasm_bindgen::from_value(transfer_msg).unwrap();
    let coin: Coin = serde_wasm_bindgen::from_value(coin).unwrap();

    let transfer_receiver_request_payload = create_transfer_receiver_request_payload(&statechain_info, &transfer_msg, &coin).unwrap();

    serde_wasm_bindgen::to_value(&transfer_receiver_request_payload).unwrap()
}

#[wasm_bindgen]
pub fn getNewKeyInfo(server_public_key_hex: String, coin: JsValue, statechain_id: String, tx0_outpoint: JsValue, tx0_hex: String, network: String) -> JsValue {

    let tx0_outpoint: TxOutpoint = serde_wasm_bindgen::from_value(tx0_outpoint).unwrap();
    let coin: Coin = serde_wasm_bindgen::from_value(coin).unwrap();
    let new_key_info = get_new_key_info(&server_public_key_hex, &coin, &statechain_id, &tx0_outpoint, &tx0_hex, &network).unwrap();

    serde_wasm_bindgen::to_value(&new_key_info).unwrap()
}
        
// pub fn create_transfer_update_msg(x1: &str, recipient_address: &str, coin: &Coin, transfer_signature: &str, backup_transactions: &Vec<BackupTx>) -> Result<TransferUpdateMsgRequestPayload> {

/*
#[wasm_bindgen]
pub fn getCoin(wallet_json: JsValue, statechain_id: String) -> JsValue {
    let wallet: Wallet = serde_wasm_bindgen::from_value(wallet_json).unwrap();
    for coin in wallet.coins.iter() {
        if coin.statechain_id == statechain_id {
            return serde_wasm_bindgen::to_value(&coin).unwrap();
        }
    }
    serde_wasm_bindgen::to_value(&Coin {
        utxo: String::from(""),
        index: 0,
        address: String::from(""),
        amount: 0,
        statechain_id: String::from(""),
        privkey: String::from(""),
        auth_key: String::from(""),
        locktime: 0,
        status: String::from(""),
    }).unwrap()
}
 */
#[wasm_bindgen]
pub fn getMockWallet() -> JsValue {
    let tokens = vec![
        Token {
            token_id: String::from("e08aee00-cfed-4ab7-b304-38d61405720e"),
            value: 10000,
            invoice: String::from("lnbc10u1pj3knpdsp5k9f25s2wpzewkf9c78pftkgnkuuz82erkcjml7zkgsp7znyhs5yspp5rxz3tkc7ydgln3u7ez6duhp0g6jpzgtnn7ph5xrjy6muh9xm07wqdp2f9h8vmmfvdjjqen0wgsy6ctfdeehgcteyp6x76m9dcxqyjw5qcqpj9qyysgq6z9whs8am75r6mzcgt76vlwgk5g9yq5g8xefdxx6few6d5why7fs7h5g2dx9hk7s60ywtnkyc0f3p0cha4a9kmgkq5jvu5e7hvsaawqpjtf8p4"),
            confirmed: true
        },
        Token {
            token_id: String::from("aed9a34c-5666-4d83-940f-9b74e16b8672"),
            value: 50000,
            invoice: String::from("lnbc10u1pj3knpdsp5k9f25s2wpzewkf9c78pftkgnkuuz82erkcjml7zkgsp7znyhs5yspp5rxz3tkc7ydgln3u7ez6duhp0g6jpzgtnn7ph5xrjy6muh9xm07wqdp2f9h8vmmfvdjjqen0wgsy6ctfdeehgcteyp6x76m9dcxqyjw5qcqpj9qyysgq6z9whs8am75r6mzcgt76vlwgk5g9yq5g8xefdxx6few6d5why7fs7h5g2dx9hk7s60ywtnkyc0f3p0cha4a9kmgkq5jvu5e7hvsaawqpjtf8p4"),
            confirmed: true
        }
    ];

    let activity = vec![
        Activity {
            utxo: String::from("9ec324592502d377dc92cee0cce84b532ce912e0379bdd3d768339819251cf57:0"),
            amount: 1000000,
            action: String::from("deposit"),
            date: "2023-11-07T12:34:56.789Z".to_string()
        },
        Activity {
            utxo: String::from("e29e13b48c83b40e1fd81120c55144c5593dca6017f098422983f7dfaeb70913:0"),
            amount: 10000000,
            action: String::from("Receive"),
            date: "2023-11-07T12:34:56.789Z".to_string()
        },
        Activity {
            utxo: String::from("84fa1bd2ff0fb9bd5ee4256671c4f6a40dca311e5301668b282dbf66a6bedcc6100p:0"),
            amount: 5000000,
            action: String::from("Receive"),
            date: "2023-11-07T12:34:56.789Z".to_string()
        }
    ];

    /*let coins = vec![
        Coin {
            utxo: String::from("9ec324592502d377dc92cee0cce84b532ce912e0379bdd3d768339819251cf57:0"),
            index: 1,
            address: String::from("sc1qd8tt2cme0heruuf9zlxeygq96lum7qzl4tf32hnkyvlta9gqvumud8su7pvdzelx5ku2hrggwhuv5v3x824re8gcjl7yhq4quhtf5vfgwszp5"),
            amount: 100,
            statechain_id: String::from("6bbf638f-107f-4ea0-8e72-1a72b7e8155b"),
            privkey: String::from("fed3c39e0b1a2cfcd4b71571a10ebf194644c7554793a312ff8970541cbad346"),
            auth_key: String::from("f5a3717cfff6a03f8f8d8681b34558ac60f706ee3e68b29b6c130acd45c33da1"),
            locktime: 854231,
            status: String::from("Confirmed"),
        },
        Coin {
            utxo: String::from("e29e13b48c83b40e1fd81120c55144c5593dca6017f098422983f7dfaeb70913:0"),
            index: 2,
            address: String::from("sc1qd8tt2cme0heruuf9zlxeygq96lum7qzl4tf32hnkyvlta9gqvumud8su7pvdzelx5ku2hrggwhuv5v3x824re8gcjl7yhq4quhtf5vfgwszp5"),
            amount: 200,
            statechain_id: String::from("aed9a34c-5666-4d83-940f-9b74e16b8672"),
            privkey: String::from("60e9cec644dc22e0137088729d61372436de6067a7625b3b0733bf0c98ae04a2"),
            auth_key: String::from("a3e88f9f13ef06cd35ac55d2c34c8ce2e8874cccb50e2545975f046f7acee8f1"),
            locktime: 845321,
            status: String::from("Confirmed"),
        },
        Coin {
            utxo: String::from("84fa1bd2ff0fb9bd5ee4256671c4f6a40dca311e5301668b282dbf66a6bedcc6100p:0"),
            index: 3,
            address: String::from("sc1qd8tt2cme0heruuf9zlxeygq96lum7qzl4tf32hnkyvlta9gqvumud8su7pvdzelx5ku2hrggwhuv5v3x824re8gcjl7yhq4quhtf5vfgwszp5"),
            amount: 300,
            statechain_id: String::from("b94cba9b-93f8-419f-8adb-a943125a20f8"),
            privkey: String::from("60e9cec644dc22e0137088729d61372436de6067a7625b3b0733bf0c98ae04a2"),
            auth_key: String::from("a3e88f9f13ef06cd35ac55d2c34c8ce2e8874cccb50e2545975f046f7acee8f1"),
            locktime: 835321,
            status: String::from("Confirmed"),
        }
    ]; */

    let wallet = Wallet {
        name: String::from("Mock Wallet"),
        mnemonic: String::from("coil knock parade empower divorce scorpion float force carbon side wonder choice"),
        version: String::from("0.1.0"),
        state_entity_endpoint: String::from(""),
        electrum_endpoint: String::from(""),
        network: String::from("testnet"),
        blockheight: 0,
        initlock: 100000,
        interval: 10,
        tokens,
        activities: activity,
        coins: Vec::new() // coins
    };
    serde_wasm_bindgen::to_value(&wallet).unwrap()
}