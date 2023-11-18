const axios = require('axios').default;
const bitcoinjs = require("bitcoinjs-lib");
const ecc = require("tiny-secp256k1");
const utils = require('./utils');
const transaction = require('./transaction');

// used only for random token. Can be removed later
const crypto = require('crypto');

const mercury_wasm = require('mercury-wasm');

const sqlite_manager = require('./sqlite_manager');

const { CoinStatus } = require('./coin_status');

const execute = async (electrumClient, db, wallet_name, token_id, amount) => {

    let wallet = await sqlite_manager.getWallet(db, wallet_name);

    await init(db, wallet, token_id, amount);

    let coin = wallet.coins[wallet.coins.length - 1];

    let aggregatedPublicKey = mercury_wasm.createAggregatedAddress(coin, wallet.network);

    coin.amount = parseInt(amount, 10);
    coin.aggregated_address = aggregatedPublicKey.aggregate_address;
    coin.aggregated_pubkey = aggregatedPublicKey.aggregate_pubkey;

    await sqlite_manager.updateWallet(db, wallet);

    await waitForDeposit(electrumClient, coin, amount, wallet.network);

    coin.status = CoinStatus.IN_MEMPOOL;

    await sqlite_manager.updateWallet(db, wallet);

    // new transaction
    /*
    let coin_nonce = mercury_wasm.createAndCommitNonces(coin);

    let server_pubnonce = await transaction.signFirst(coin_nonce.sign_first_request_payload);

    coin.secret_nonce = coin_nonce.secret_nonce;
    coin.public_nonce = coin_nonce.public_nonce;
    coin.server_public_nonce = server_pubnonce;
    coin.blinding_factor = coin_nonce.blinding_factor;

    await sqlite_manager.updateWallet(db, wallet);

    const serverInfo = await utils.infoConfig(electrumClient);

    const block_header = await electrumClient.request('blockchain.headers.subscribe'); // request(promise)
    const blockheight = block_header.height;

    const initlock = serverInfo.initlock;
    const interval = serverInfo.interval;
    const feeRateSatsPerByte = serverInfo.fee_rate_sats_per_byte;
    const qtBackupTx = 0;

    const network = wallet.network;
    const toAddress = mercury_wasm.getUserBackupAddress(coin, network);
    const isWithdrawal = false;


    let partialSigRequest = mercury_wasm.getPartialSigRequest(
        coin,
        blockheight,
        initlock, 
        interval,
        feeRateSatsPerByte,
        qtBackupTx,
        toAddress,
        network,
        isWithdrawal);

    const serverPartialSigRequest = partialSigRequest.partial_signature_request_payload;

    const serverPartialSig = await transaction.signSecond(serverPartialSigRequest);

    const clientPartialSig = partialSigRequest.client_partial_sig;
    const msg = partialSigRequest.msg;
    const session = partialSigRequest.encoded_session;
    const outputPubkey = partialSigRequest.output_pubkey;

    const signature = mercury_wasm.createSignature(msg, clientPartialSig, serverPartialSig, session, outputPubkey);

    const encodedUnsignedTx = partialSigRequest.encoded_unsigned_tx;

    let signed_tx = mercury_wasm.newBackupTransaction(encodedUnsignedTx, signature);
    */

    const toAddress = mercury_wasm.getUserBackupAddress(coin, wallet.network);
    const isWithdrawal = false;
    const qtBackupTx = 0;

    let signed_tx = await transaction.new_transaction(electrumClient, coin, toAddress, isWithdrawal, qtBackupTx, wallet.network);

    let backup_tx = {
        tx_n: 1,
        tx: signed_tx,
        client_public_nonce: coin.public_nonce,
        server_public_nonce: coin.server_public_nonce,
        client_public_key: coin.user_pubkey,
        server_public_key: coin.server_pubkey,
        blinding_factor: coin.blinding_factor
    };

    await sqlite_manager.insertTransaction(db, coin.statechain_id, [backup_tx]);
   
    // let res = await electrumClient.request('blockchain.transaction.broadcast', [signed_tx]);

    let utxo = `${coin.utxo_txid}:${coin.input_vout}`;

    let activity = {
        utxo: utxo,
        amount: coin.amount,
        action: "Deposit",
        date: new Date().toISOString()
    };

    wallet.activities.push(activity);

    await sqlite_manager.updateWallet(db, wallet);
}

const init = async (db, wallet, token_id, amount) => {
    let coin = mercury_wasm.getNewCoin(wallet);

    wallet.coins.push(coin);

    await sqlite_manager.updateWallet(db, wallet);

    token_id = crypto.randomUUID().replace('-','');

    let depositMsg1 = mercury_wasm.createDepositMsg1(coin, token_id, parseInt(amount, 10));

    const statechain_entity_url = 'http://127.0.0.1:8000';
    const path = "deposit/init/pod";
    const url = statechain_entity_url + '/' + path;

    const response = await axios.post(url, depositMsg1);
    let depositMsg1Response = response.data;

    let depositInitResult = mercury_wasm.handleDepositMsg1Response(coin, depositMsg1Response);
    console.log("depositInitResult:", depositInitResult);

    coin.statechain_id = depositInitResult.statechain_id;
    coin.signed_statechain_id = depositInitResult.signed_statechain_id;
    coin.server_pubkey = depositInitResult.server_pubkey;

    await sqlite_manager.updateWallet(db, wallet);
}

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const waitForDeposit = async (electrumClient, coin, amount, wallet_network) => {

    console.log(`address: ${coin.aggregated_address}`);
    console.log("waiting for deposit ....");

    bitcoinjs.initEccLib(ecc);

    const network = utils.getNetwork(wallet_network);

    let script = bitcoinjs.address.toOutputScript(coin.aggregated_address, network);
    let hash = bitcoinjs.crypto.sha256(script);
    let reversedHash = Buffer.from(hash.reverse());
    reversedHash = reversedHash.toString('hex');

    let is_waiting = true;

    while (is_waiting) {
        try {
            let utxo_list = await electrumClient.request('blockchain.scripthash.listunspent', [reversedHash]);

            for (let utxo of utxo_list) {
                if (utxo.value === parseInt(amount, 10)) {
                    console.log("utxo found");
                    console.log(utxo);

                    // coin.utxo = `${utxo.tx_hash}:${utxo.tx_pos}`;
                    coin.utxo_txid = utxo.tx_hash;
                    coin.utxo_vout = utxo.tx_pos;
                    is_waiting = false;
                    break;
                }
            }
        } catch (e) {
            console.log(e);
        }

        await sleep(5000);
    }
}

module.exports = { execute };