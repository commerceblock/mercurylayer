#![allow(non_snake_case)]

mod utils;

use mercurylib::{decode_transfer_address, deposit::DepositMsg1Response, transfer::{receiver::{create_transfer_receiver_request_payload, decrypt_transfer_msg, get_new_key_info, StatechainInfo, StatechainInfoResponsePayload, TxOutpoint}, sender::create_transfer_signature, TransferMsg}, utils::ServerConfig, wallet::{Activity, BackupTx, Coin, Settings, Token, Wallet}};
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

    mercurylib::wallet::set_config(&mut wallet, &config);

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
pub fn getSCAddress(wallet_json: JsValue, index: u32, network: String) -> String {
    let wallet: Wallet = serde_wasm_bindgen::from_value(wallet_json).unwrap();
    let address = mercurylib::get_sc_address(&wallet.mnemonic, index, &network).unwrap();
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

    let settings = Settings {
        network: String::from("signet"),
        block_explorerURL: None,
        torProxyHost: None,
        torProxyPort: None,
        torProxyControlPassword: None,
        torProxyControlPort: None,
        statechainEntityApi: String::from("http://127.0.0.1:8000"),
        torStatechainEntityApi: None,
        electrumProtocol: String::from("tcp"),
        electrumHost: String::from("signet-electrumx.wakiyamap.dev"),
        electrumPort: String::from("50001"),
        electrumType: String::from("electrs"),
        notifications: false,
        tutorials: false
    };

    let mut wallet = Wallet {
        name,
        mnemonic,
        version: String::from("0.1.0"),
        state_entity_endpoint: String::from("http://127.0.0.1:8000"),
        electrum_endpoint: String::from("tcp://signet-electrumx.wakiyamap.dev:50001"),
        network: String::from("signet"),
        blockheight: 0,
        initlock: 100000,
        interval: 10,
        tokens: Vec::new(),
        activities: Vec::new(),
        coins: Vec::new(),
        // settings
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
pub fn createDepositMsg1(coin_json: JsValue, token_id: String) -> JsValue {
    let coin: Coin = serde_wasm_bindgen::from_value(coin_json).unwrap();
    let deposit_msg_1 = mercurylib::deposit::create_deposit_msg1(&coin, &token_id).unwrap();
    serde_wasm_bindgen::to_value(&deposit_msg_1).unwrap()
}

#[wasm_bindgen]
pub fn handleDepositMsg1Response(coin_json: JsValue, deposit_msg_1_response_json: JsValue) -> JsValue {
    let coin: Coin = serde_wasm_bindgen::from_value(coin_json).unwrap();
    let deposit_msg_1_response: DepositMsg1Response = serde_wasm_bindgen::from_value(deposit_msg_1_response_json).unwrap();
    let deposit_init_result = mercurylib::deposit::handle_deposit_msg_1_response(&coin, &deposit_msg_1_response).unwrap();
    serde_wasm_bindgen::to_value(&deposit_init_result).unwrap()
}

#[wasm_bindgen]
pub fn createAggregatedAddress(coin_json: JsValue, network: String) -> JsValue {
    let coin: Coin = serde_wasm_bindgen::from_value(coin_json).unwrap();
    let aggregated_public_key = mercurylib::deposit::create_aggregated_address(&coin, network).unwrap();
    serde_wasm_bindgen::to_value(&aggregated_public_key).unwrap()
}

#[wasm_bindgen]
pub fn createAndCommitNonces(coin_json: JsValue) -> JsValue {
    let coin: Coin = serde_wasm_bindgen::from_value(coin_json).unwrap();
    let coin_nonce = mercurylib::transaction::create_and_commit_nonces(&coin).unwrap();
    serde_wasm_bindgen::to_value(&coin_nonce).unwrap()
}

#[wasm_bindgen]
pub fn getUserBackupAddress(coin_json: JsValue, network: String) -> String {
    let coin: Coin = serde_wasm_bindgen::from_value(coin_json).unwrap();
    let backup_address = mercurylib::transaction::get_user_backup_address(&coin, network).unwrap();
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

    let partial_sig_request = mercurylib::transaction::get_partial_sig_request(
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
    let signature = mercurylib::transaction::create_signature(msg, client_partial_sig_hex, server_partial_sig_hex, session_hex, output_pubkey_hex).unwrap();
    signature
}

#[wasm_bindgen]
pub fn newBackupTransaction(encoded_unsigned_tx: String, signature_hex: String) -> String
{
    let backup_tx = mercurylib::transaction::new_backup_transaction(encoded_unsigned_tx, signature_hex).unwrap();
    backup_tx
}

#[wasm_bindgen]
pub fn createCpfpTx(backup_tx_json: JsValue, coin_json: JsValue, to_address: String, fee_rate_sats_per_byte: u32, network: String) -> String {
    let coin: Coin = serde_wasm_bindgen::from_value(coin_json).unwrap();
    let backup_tx: BackupTx = serde_wasm_bindgen::from_value(backup_tx_json).unwrap();

    let backup_tx = mercurylib::wallet::cpfp_tx::create_cpfp_tx(&backup_tx, &coin, &to_address, fee_rate_sats_per_byte as u64, &network).unwrap();
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

    let transfer_update_msg_request_payload = mercurylib::transfer::sender::create_transfer_update_msg(&x1, &recipient_address, &coin, &transfer_signature, &backup_transactions).unwrap();

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
    let tx0_outpoint = mercurylib::transfer::receiver::get_tx0_outpoint(&backup_transactions).unwrap();
    serde_wasm_bindgen::to_value(&tx0_outpoint).unwrap()
}

#[wasm_bindgen]
pub fn verifyTransferSignature(new_user_pubkey: String, tx0_outpoint: JsValue, transfer_msg: JsValue) -> bool {
    let tx0_outpoint: TxOutpoint = serde_wasm_bindgen::from_value(tx0_outpoint).unwrap();
    let transfer_msg: TransferMsg = serde_wasm_bindgen::from_value(transfer_msg).unwrap();
    let result = mercurylib::transfer::receiver::verify_transfer_signature(&new_user_pubkey, &tx0_outpoint, &transfer_msg).unwrap();
    result
}

#[wasm_bindgen]
pub fn validateTx0OutputPubkey(enclave_public_key: String, transfer_msg: JsValue, tx0_outpoint: JsValue, tx0_hex: String, network: String) -> bool {
    let tx0_outpoint: TxOutpoint = serde_wasm_bindgen::from_value(tx0_outpoint).unwrap();
    let transfer_msg: TransferMsg = serde_wasm_bindgen::from_value(transfer_msg).unwrap();
    let result = mercurylib::transfer::receiver::validate_tx0_output_pubkey(&enclave_public_key, &transfer_msg, &tx0_outpoint, &tx0_hex, &network).unwrap();
    result
}

#[wasm_bindgen]
pub fn verifyLatestBackupTxPaysToUserPubkey(transfer_msg: JsValue, client_pubkey_share: String, network: String) -> bool {
    let transfer_msg: TransferMsg = serde_wasm_bindgen::from_value(transfer_msg).unwrap();
    let result = mercurylib::transfer::receiver::verify_latest_backup_tx_pays_to_user_pubkey(&transfer_msg, &client_pubkey_share, &network).unwrap();
    result
}

#[wasm_bindgen]
pub fn getOutputAddressFromTx0(tx0_outpoint: JsValue, tx0_hex: String, network: String) -> String {
    let tx0_outpoint: TxOutpoint = serde_wasm_bindgen::from_value(tx0_outpoint).unwrap();
    let output_address = mercurylib::transfer::receiver::get_output_address_from_tx0(&tx0_outpoint, &tx0_hex, &network).unwrap();
    output_address
}

#[wasm_bindgen]
pub fn verifyTransactionSignature(tx_n_hex: String, tx0_hex: String, fee_rate_tolerance: u32, current_fee_rate_sats_per_byte: u32) -> JsValue {
    let result = mercurylib::transfer::receiver::verify_transaction_signature(&tx_n_hex, &tx0_hex, fee_rate_tolerance, current_fee_rate_sats_per_byte);

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

    let result = mercurylib::transfer::receiver::verify_blinded_musig_scheme(&backup_tx, &tx0_hex, &statechain_info);
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
    let blockheight = mercurylib::utils::get_blockheight(&backup_tx).unwrap();
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

#[wasm_bindgen]
pub fn validateAddress(address: String, network: String) -> bool {
    let result = mercurylib::validate_address(&address, &network).unwrap();
    result
}

#[wasm_bindgen]
pub fn signMessage(statechain_id: String, coin: JsValue) -> String {

    let coin: Coin = serde_wasm_bindgen::from_value(coin).unwrap();

    let signature = mercurylib::transfer::receiver::sign_message(&statechain_id, &coin).unwrap();

    signature
}

#[wasm_bindgen]
pub fn getMockWallet() -> JsValue {
    let tokens = vec![
        Token {
            // btc_payment_address: String::from("bc1..."),
            // fee: String::from("0.001"),
            lightning_invoice: String::from("lnbc10u1pj3knpdsp5k9f25s2wpzewkf9c78pftkgnkuuz82erkcjml7zkgsp7znyhs5yspp5rxz3tkc7ydgln3u7ez6duhp0g6jpzgtnn7ph5xrjy6muh9xm07wqdp2f9h8vmmfvdjjqen0wgsy6ctfdeehgcteyp6x76m9dcxqyjw5qcqpj9qyysgq6z9whs8am75r6mzcgt76vlwgk5g9yq5g8xefdxx6few6d5why7fs7h5g2dx9hk7s60ywtnkyc0f3p0cha4a9kmgkq5jvu5e7hvsaawqpjtf8p4"),
            processor_id: String::from("e04r5e00-cgdd-5yb7-y704-52631405720e"),
            token_id: String::from("e08aee00-cfed-4ab7-b304-38d61405720e"),
            confirmed: true,
            spent: false,
            // expiry: "2023-11-07T12:34:56.789Z".to_string()
        },
        Token {
            // btc_payment_address: String::from("bc1..."),
            // fee: String::from("0.001"),
            processor_id: String::from("e04r5e00-cgdd-5yb7-y704-52631405720e"),
            lightning_invoice: String::from("lnbc10u1pj3knpdsp5k9f25s2wpzewkf9c78pftkgnkuuz82erkcjml7zkgsp7znyhs5yspp5rxz3tkc7ydgln3u7ez6duhp0g6jpzgtnn7ph5xrjy6muh9xm07wqdp2f9h8vmmfvdjjqen0wgsy6ctfdeehgcteyp6x76m9dcxqyjw5qcqpj9qyysgq6z9whs8am75r6mzcgt76vlwgk5g9yq5g8xefdxx6few6d5why7fs7h5g2dx9hk7s60ywtnkyc0f3p0cha4a9kmgkq5jvu5e7hvsaawqpjtf8p4"),
            token_id: String::from("aed9a34c-5666-4d83-940f-9b74e16b8672"),
            confirmed: true,
            spent: false,
            // expiry: "2023-11-07T12:34:56.789Z".to_string()
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

    let settings = Settings {
        network: String::from("signet"),
        block_explorerURL: None,
        torProxyHost: None,
        torProxyPort: None,
        torProxyControlPassword: None,
        torProxyControlPort: None,
        statechainEntityApi: String::from("http://127.0.0.1:8000"),
        torStatechainEntityApi: None,
        electrumProtocol: String::from("tcp"),
        electrumHost: String::from("signet-electrumx.wakiyamap.dev"),
        electrumPort: String::from("50001"),
        electrumType: String::from("electrs"),
        notifications: false,
        tutorials: false
    };

    let wallet = Wallet {
        name: String::from("Mock Wallet"),
        mnemonic: String::from("coil knock parade empower divorce scorpion float force carbon side wonder choice"),
        version: String::from("0.1.0"),
        state_entity_endpoint: String::from("http://127.0.0.1:8000"),
        electrum_endpoint: String::from("tcp://signet-electrumx.wakiyamap.dev:50001"),
        network: String::from("signet"),
        blockheight: 0,
        initlock: 100000,
        interval: 10,
        tokens,
        activities: activity,
        coins: Vec::new(), // coins
        // settings
    };
    serde_wasm_bindgen::to_value(&wallet).unwrap()
}