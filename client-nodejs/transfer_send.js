const sqlite_manager = require('./sqlite_manager');
const mercury_wasm = require('mercury-wasm');
const transaction = require('./transaction');
const axios = require('axios').default;

const execute = async (electrumClient, db, walletName, statechainId, toAddress)  => {

    let wallet = await sqlite_manager.getWallet(db, walletName);

    const backupTxs = await sqlite_manager.getBackupTxs(db, statechainId);

    if (backupTxs.length === 0) {
        throw new Error(`There is no backup transaction for the statechain id ${statechainId}`);
    }

    const new_tx_n = backupTxs.length + 1;

    let coin = wallet.coins.filter(c => {
        return c.statechain_id === statechainId
    });

    if (!coin) {
        throw new Error(`There is no coin for the statechain id ${statechainId}`);
    }

    coin = coin[0];

    const isWithdrawal = true;
    const qtBackupTx = backupTxs.length;

    const signed_tx = await transaction.new_transaction(electrumClient, coin, toAddress, isWithdrawal, qtBackupTx, wallet.network);

    console.log("signed_tx: ", signed_tx);

    const statechain_id = coin.statechain_id;
    const signed_statechain_id = coin.signed_statechain_id;
    const new_auth_pubkey = coin.auth_pubkey;

    const new_x1 = await get_new_x1(statechain_id, signed_statechain_id, new_auth_pubkey);

    console.log("new_x1: ", new_x1);

    const backup_tx = {
        tx_n: new_tx_n,
        tx: signed_tx,
        client_public_nonce: coin.public_nonce,
        blinding_factor: coin.blinding_factor,
    };

    backupTxs.push(backup_tx);

    const input_txid = coin.utxo_txid;
    const input_vout = coin.utxo_vout;
    const client_seckey = coin.user_privkey;
    const recipient_address = toAddress;

    console.log("recipient_address", recipient_address);

    const transfer_signature = mercury_wasm.createTransferSignature(recipient_address, input_txid, input_vout, client_seckey);

    console.log("transfer_signature", transfer_signature);

    const transferUpdateMsgRequestPayload = mercury_wasm.createTransferUpdateMsg(new_x1, recipient_address, coin, transfer_signature, backupTxs);

    console.log("transferUpdateMsgRequestPayload", transferUpdateMsgRequestPayload);

}

const get_new_x1 = async (statechain_id, signed_statechain_id, new_auth_pubkey) => {

    const statechain_entity_url = 'http://127.0.0.1:8000';
    const path = "transfer/sender";
    const url = statechain_entity_url + '/' + path;

    let transferSenderRequestPayload = {
        statechain_id: statechain_id,
        auth_sig: signed_statechain_id,
        new_user_auth_key: new_auth_pubkey,
        batch_id: null,
    };

    const response = await axios.post(url, transferSenderRequestPayload);

    return response.data.x1;
}

module.exports = { execute };