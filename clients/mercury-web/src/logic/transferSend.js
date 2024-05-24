import * as mercury_wasm from 'mercury-wasm';
import transaction from './transaction';
import CoinStatus from './coinEnum.js';
import utils from './utils.js'

const execute = async (wallet, coin, backupTxs, toAddress)  => {

    let coinBackupTx = backupTxs.filter(b => b.statechain_id === coin.statechain_id);

    if (coinBackupTx.length === 0) {
        throw new Error(`There is no backup transaction for the statechain id ${coin.statechain_id}`);
    }

    let coinBackupTxs = coinBackupTx[0].backupTxs;

    if (coinBackupTxs.length === 0) {
        throw new Error(`There is no backup transaction for the statechain id ${coin.statechain_id}`);
    }

    const new_tx_n = coinBackupTxs.length + 1;

    if (coin.status != CoinStatus.CONFIRMED) {
        throw new Error(`Coin status must be CONFIRMED to transfer it. The current status is ${coin.status}`);
    }

    const isWithdrawal = false;
    const qtBackupTx = coinBackupTxs.length;

    console.log("coinBackupTxs", coinBackupTxs);

    let clonedBackupTxs = structuredClone(coinBackupTxs);

    clonedBackupTxs.sort((a, b) => a.tx_n - b.tx_n);

    const bkp_tx1 = clonedBackupTxs[0];

    const block_height = mercury_wasm.getBlockheight(bkp_tx1);

    let updatedCoin = structuredClone(coin);

    const signed_tx = await transaction.newTransaction(updatedCoin, toAddress, isWithdrawal, qtBackupTx, block_height, wallet.network);

    const statechain_id = updatedCoin.statechain_id;
    const signed_statechain_id = updatedCoin.signed_statechain_id;

    const decodedTransferAddress = mercury_wasm.decodeTransferAddress(toAddress);
    const new_auth_pubkey = decodedTransferAddress.auth_pubkey;

    const new_x1 = await window.api.getNewX1({
        statechain_id, signed_statechain_id, new_auth_pubkey
    });

    const backupTx = {
        tx_n: new_tx_n,
        tx: signed_tx,
        client_public_nonce: updatedCoin.public_nonce,
        server_public_nonce: updatedCoin.server_public_nonce,
        client_public_key: updatedCoin.user_pubkey,
        server_public_key: updatedCoin.server_pubkey,
        blinding_factor: updatedCoin.blinding_factor
    };

    /* backupTxs.push(backup_tx); */
 
    clonedBackupTxs.push(backupTx);

    const input_txid = updatedCoin.utxo_txid;
    const input_vout = updatedCoin.utxo_vout;
    const client_seckey = updatedCoin.user_privkey;
    const recipient_address = toAddress;

    const transfer_signature = mercury_wasm.createTransferSignature(recipient_address, input_txid, input_vout, client_seckey);

    const transferUpdateMsgRequestPayload = mercury_wasm.createTransferUpdateMsg(new_x1, recipient_address, updatedCoin, transfer_signature, clonedBackupTxs);

    const isMessageUpdated = await window.api.updateMsg(transferUpdateMsgRequestPayload);

    if (!isMessageUpdated) {
        throw new Error(`Transfer update failed`);
    }

    let utxo = `${updatedCoin.utxo_txid}:${updatedCoin.utxo_vout}`;

    const activity = utils.createActivity(utxo, updatedCoin.amount, "Transfer");

    /* wallet.activities.push(activity);*/
    updatedCoin.status = CoinStatus.IN_TRANSFER; 

    return { updatedCoin, newBackupTx: backupTx, walletName: wallet.name, activity };
}

export default { execute };