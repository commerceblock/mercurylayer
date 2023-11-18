const sqlite_manager = require('./sqlite_manager');
const mercury_wasm = require('mercury-wasm');
const transaction = require('./transaction');
const axios = require('axios').default;
const { CoinStatus } = require('./coin_status');

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

    const isWithdrawal = false;
    const qtBackupTx = backupTxs.length;

    backupTxs.sort((a, b) => a.tx_n - b.tx_n);

    const bkp_tx1 = backupTxs[0];

    const block_height = mercury_wasm.getBlockheight(bkp_tx1);

    const signed_tx = await transaction.new_transaction(electrumClient, coin, toAddress, isWithdrawal, qtBackupTx, block_height, wallet.network);

    const statechain_id = coin.statechain_id;
    const signed_statechain_id = coin.signed_statechain_id;

    const decodedTransferAddress = mercury_wasm.decodeTransferAddress(toAddress);
    const new_auth_pubkey = decodedTransferAddress.auth_pubkey;

    const new_x1 = await get_new_x1(statechain_id, signed_statechain_id, new_auth_pubkey);

    const backup_tx = {
        tx_n: new_tx_n,
        tx: signed_tx,
        client_public_nonce: coin.public_nonce,
        server_public_nonce: coin.server_public_nonce,
        client_public_key: coin.user_pubkey,
        server_public_key: coin.server_pubkey,
        blinding_factor: coin.blinding_factor
    };

    backupTxs.push(backup_tx);

    const input_txid = coin.utxo_txid;
    const input_vout = coin.utxo_vout;
    const client_seckey = coin.user_privkey;
    const recipient_address = toAddress;

    const transfer_signature = mercury_wasm.createTransferSignature(recipient_address, input_txid, input_vout, client_seckey);

    const transferUpdateMsgRequestPayload = mercury_wasm.createTransferUpdateMsg(new_x1, recipient_address, coin, transfer_signature, backupTxs);

    const statechain_entity_url = 'http://127.0.0.1:8000';
    const path = "transfer/update_msg";
    const url = statechain_entity_url + '/' + path;

    const response = await axios.post(url, transferUpdateMsgRequestPayload);

    if (!response.data.updated) {
        throw new Error(`Transfer update failed`);
    }

    await sqlite_manager.updateTransaction(db, coin.statechain_id, backupTxs);

    let utxo = `${coin.utxo_txid}:${coin.input_vout}`;

    let activity = {
        utxo: utxo,
        amount: coin.amount,
        action: "Transfer",
        date: new Date().toISOString()
    };

    wallet.activities.push(activity);
    coin.status = CoinStatus.IN_TRANSFER;

    await sqlite_manager.updateWallet(db, wallet);

    console.log("Transfer completed");
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