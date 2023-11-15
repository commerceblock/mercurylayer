const sqlite_manager = require('./sqlite_manager');
const mercury_wasm = require('mercury-wasm');
const axios = require('axios').default;

const newTransferAddress = async (db, wallet_name) => {

    let wallet = await sqlite_manager.getWallet(db, wallet_name);

    let coin = mercury_wasm.getNewCoin(wallet);

    wallet.coins.push(coin);

    await sqlite_manager.updateWallet(db, wallet);

    return coin.address;
}

const get_msg_addr = async (auth_pubkey) => {

    const statechain_entity_url = 'http://127.0.0.1:8000';
    const path = "transfer/get_msg_addr/";
    const url = statechain_entity_url + '/' + path + auth_pubkey;

    const response = await axios.get(url);

    return response.data.list_enc_transfer_msg;
}

const execute = async (db, wallet_name) => {

    let wallet = await sqlite_manager.getWallet(db, wallet_name);

    for (let coin of wallet.coins) {

        console.log("----\nuser_pubkey", coin.user_pubkey);
        console.log("auth_pubkey", coin.auth_pubkey);
        console.log("statechain_id", coin.statechain_id);
        console.log("coin.amount", coin.amount);
        console.log("coin.status", coin.status);

        let encMessages = await get_msg_addr(coin.auth_pubkey);

        if (encMessages.length == 0) {
            console.log("No messages for this coin");
            continue;
        }

        console.log("encMessages", encMessages);
    }
}

module.exports = { newTransferAddress, execute };
