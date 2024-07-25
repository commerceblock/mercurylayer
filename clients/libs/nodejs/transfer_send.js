const sqlite_manager = require('./sqlite_manager');
const mercury_wasm = require('mercury-wasm');
const transaction = require('./transaction');
const axios = require('axios').default;
const { SocksProxyAgent } = require('socks-proxy-agent');
const { CoinStatus } = require('./coin_enum');
const utils = require('./utils');

const execute = async (clientConfig, electrumClient, db, walletName, statechainId, toAddress, forceSend, batchId)  => {

    let wallet = await sqlite_manager.getWallet(db, walletName);

    const backupTxs = await sqlite_manager.getBackupTxs(db, statechainId);

    if (backupTxs.length === 0) {
        throw new Error(`There is no backup transaction for the statechain id ${statechainId}`);
    }

    const new_tx_n = backupTxs.length + 1;

    const isCoinDuplicated = wallet.coins.some(c => 
        c.statechain_id === statechainId &&
        c.status === CoinStatus.DUPLICATED
    );
      
    const areThereDuplicateCoinsWithdrawn = wallet.coins.some(c => 
        c.statechain_id === statechainId &&
        (c.status === CoinStatus.WITHDRAWING || c.status === CoinStatus.WITHDRAWN) &&
        c.duplicate_index > 0
    );
      
    if (areThereDuplicateCoinsWithdrawn) {
        throw new Error("There have been withdrawals of other coins with this same statechain_id (possibly duplicates). " +
            "This transfer cannot be performed because the recipient would reject it due to the difference in signature count. " +
            "This coin can be withdrawn, however."
        );
    }

    let coinsWithStatechainId = wallet.coins.filter(c => {
        return c.statechain_id === statechainId && c.status != CoinStatus.DUPLICATED
    });

    if (!coinsWithStatechainId || coinsWithStatechainId.length === 0) {
        throw new Error(`There is no coin for the statechain id ${statechainId}`);
    }

    // If the user sends to himself, he will have two coins with same statechain_id
    // In this case, we need to find the one with the lowest locktime
    // Sort the coins by locktime in ascending order and pick the first one
    let coin = coinsWithStatechainId.sort((a, b) => a.locktime - b.locktime)[0];

    if (coin.status != CoinStatus.CONFIRMED && coin.status != CoinStatus.IN_TRANSFER) {
        throw new Error(`Coin status must be CONFIRMED or IN_TRANSFER to transfer it. The current status is ${coin.status}`);
    }

    if (isCoinDuplicated && !forceSend) {
        throw new Error("Coin is duplicated. If you want to proceed, use the command '--force, -f' option. " +
            "You will no longer be able to move other duplicate coins with the same statechain_id and this will cause PERMANENT LOSS of these duplicate coin funds.");
    }

    if (coin.locktime == null) {
        throw new Error("Coin.locktime is null");
    }

    const blockHeader = await electrumClient.request('blockchain.headers.subscribe'); // request(promise)
    const currentBlockheight = blockHeader.height;

    const serverInfo = await utils.infoConfig(clientConfig, electrumClient);

    if (currentBlockheight + serverInfo.interval >= coin.locktime)  {
        throw new Error(`The coin is expired. Coin locktime is ${coin.locktime} and current blockheight is ${currentBlockheight}`);
    }

    const statechain_id = coin.statechain_id;
    const signed_statechain_id = coin.signed_statechain_id;

    const isWithdrawal = false;
    const qtBackupTx = backupTxs.length;

    backupTxs.sort((a, b) => a.tx_n - b.tx_n);

    const bkp_tx1 = backupTxs[0];

    const block_height = mercury_wasm.getBlockheight(bkp_tx1);

    const decodedTransferAddress = mercury_wasm.decodeTransferAddress(toAddress);
    const new_auth_pubkey = decodedTransferAddress.auth_pubkey;

    const new_x1 = await get_new_x1(clientConfig, statechain_id, signed_statechain_id, new_auth_pubkey, batchId);

    let feeRateSatsPerByte = (serverInfo.fee_rate_sats_per_byte > clientConfig.maxFeeRate) ? clientConfig.maxFeeRate: serverInfo.fee_rate_sats_per_byte;

    const signed_tx = await transaction.new_transaction(
        clientConfig, 
        electrumClient, 
        coin, 
        toAddress, 
        isWithdrawal, 
        qtBackupTx, 
        block_height, 
        wallet.network,
        feeRateSatsPerByte,
        serverInfo.initlock,
        serverInfo.interval
    );

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

    const statechain_entity_url = clientConfig.statechainEntity;
    const path = "transfer/update_msg";
    const url = statechain_entity_url + '/' + path;

    const torProxy = clientConfig.torProxy;

    let socksAgent = undefined;

    if (torProxy) {
        socksAgent = { httpAgent: new SocksProxyAgent(torProxy) };
    }

    const response = await axios.post(url, transferUpdateMsgRequestPayload, socksAgent);

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

    return coin;
}

const get_new_x1 = async (clientConfig, statechain_id, signed_statechain_id, new_auth_pubkey, batchId) => {

    const statechain_entity_url = clientConfig.statechainEntity;
    const path = "transfer/sender";
    const url = statechain_entity_url + '/' + path;

    let transferSenderRequestPayload = {
        statechain_id: statechain_id,
        auth_sig: signed_statechain_id,
        new_user_auth_key: new_auth_pubkey,
        batch_id: batchId,
    };

    const torProxy = clientConfig.torProxy;

    let socksAgent = undefined;

    if (torProxy) {
        socksAgent = { httpAgent: new SocksProxyAgent(torProxy) };
    }

    let response;
    try {
        response = await axios.post(url, transferSenderRequestPayload, socksAgent);
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error('Error: Connection refused. The server at 0.0.0.0:8000 is not available.');
        } else {
            console.error('An error occurred:', error.message);
        }
    }
    return response?.data?.x1;
}

module.exports = { execute };