const axios = require('axios').default;

// used only for random token. Can be removed later
const crypto = require('crypto');

const mercury_wasm = require('mercury-wasm');

const sqlite_manager = require('./sqlite_manager');

const execute = async (db, wallet_name, token_id, amount) => {

    let wallet = await sqlite_manager.getWallet(db, wallet_name);

    await init(db, wallet, token_id, amount);

    let coin = wallet.coins[wallet.coins.length - 1];

    let aggregatedPublicKey = mercury_wasm.createAggregatedAddress(coin, wallet.network);

    coin.aggregated_address = aggregatedPublicKey.aggregate_address;
    coin.aggregated_pubkey = aggregatedPublicKey.aggregate_pubkey;

    await sqlite_manager.updateWallet(db, wallet);

    console.log(wallet);
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

module.exports = { execute };