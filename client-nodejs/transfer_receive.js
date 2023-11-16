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

const execute = async (electrumClient, db, wallet_name) => {

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

        await process_encrypted_message(electrumClient, coin, encMessages, wallet.network);
    }
}

const get_msg_addr = async (auth_pubkey) => {

    const statechain_entity_url = 'http://127.0.0.1:8000';
    const path = "transfer/get_msg_addr/";
    const url = statechain_entity_url + '/' + path + auth_pubkey;

    const response = await axios.get(url);

    return response.data.list_enc_transfer_msg;
}

const process_encrypted_message = async (electrumClient, coin, encMessages, network) => {
    let clientAuthKey = coin.auth_privkey;
    let newUserPubkey = coin.user_pubkey;

    for (let encMessage of encMessages) {

        let transferMsg = mercury_wasm.decryptTransferMsg(encMessage, clientAuthKey);

        console.log("transferMsg", transferMsg);

        let tx0Outpoint = mercury_wasm.getTx0Outpoint(transferMsg.backup_transactions);

        console.log("tx0_outpoint", tx0Outpoint);
        
        const tx0Hex = await getTx0(electrumClient, tx0Outpoint.txid);

        console.log("tx0_hex", tx0Hex);

        const isTransferSignatureValid = mercury_wasm.verifyTransferSignature(newUserPubkey, tx0Outpoint, transferMsg);

        if (!isTransferSignatureValid) {
            console.log("Invalid transfer signature");
            continue;
        }
        
        const statechain_info = await getStatechainInfo(transferMsg.statechain_id);

        const isTx0OutputPubkeyValid = mercury_wasm.validateTx0OutputPubkey(statechain_info.enclave_public_key, transferMsg, tx0Outpoint, tx0Hex, network);

        console.log("isTx0OutputPubkeyValid", isTx0OutputPubkeyValid);

        if (!isTx0OutputPubkeyValid) {
            console.log("Invalid tx0 output pubkey");
            continue;
        }
    }
}

const getTx0 = async (electrumClient, tx0_txid) => {
    return await electrumClient.request('blockchain.transaction.get', [tx0_txid]); // request(promise)
}

const getStatechainInfo = async (statechain_id) => {

    const statechainEntityUrl = 'http://127.0.0.1:8000';
    const path = `info/statechain/${statechain_id}`;

    let response = await axios.get(statechainEntityUrl + '/' + path);

    return response.data;
}

module.exports = { newTransferAddress, execute };
