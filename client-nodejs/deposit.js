const axios = require('axios').default;
const bitcoinjs = require("bitcoinjs-lib");
const ecc = require("tiny-secp256k1");
const utils = require('./utils');

// used only for random token. Can be removed later
const crypto = require('crypto');

const mercury_wasm = require('mercury-wasm');

const sqlite_manager = require('./sqlite_manager');

const execute = async (electrumClient, db, wallet_name, token_id, amount) => {

    let wallet = await sqlite_manager.getWallet(db, wallet_name);

    await init(db, wallet, token_id, amount);

    let coin = wallet.coins[wallet.coins.length - 1];

    let aggregatedPublicKey = mercury_wasm.createAggregatedAddress(coin, wallet.network);

    coin.aggregated_address = aggregatedPublicKey.aggregate_address;
    coin.aggregated_pubkey = aggregatedPublicKey.aggregate_pubkey;

    await sqlite_manager.updateWallet(db, wallet);

    console.log(wallet);

    await wait_for_deposit(electrumClient, coin, amount, wallet.network);

    await sqlite_manager.updateWallet(db, wallet);
}

const init = async (db, wallet, token_id, amount) => {
    console.log(wallet);

    let coin = mercury_wasm.getNewCoin(wallet);

    wallet.coins.push(coin);

    await sqlite_manager.updateWallet(db, wallet);

    token_id = crypto.randomUUID().replace('-','');

    let depositMsg1 = mercury_wasm.createDepositMsg1(coin, token_id, parseInt(amount, 10));

    console.log(depositMsg1);

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

const wait_for_deposit = async (electrumClient, coin, amount, wallet_network) => {

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
        console.log("waiting ....");

        try {
            let utxo_list = await electrumClient.request('blockchain.scripthash.listunspent', [reversedHash]);

            for (let utxo of utxo_list) {
                if (utxo.value === parseInt(amount, 10)) {
                    console.log("utxo found");
                    console.log(utxo);

                    coin.utxo = `${utxo.tx_hash}:${utxo.tx_pos}`;
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