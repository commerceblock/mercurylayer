import axios from 'axios';
import storageManager from './storage_manager.js';
import utils from './utils.js';
import CoinStatus from './coin_enum.js';
import transaction from './transaction.js';

const execute = async (clientConfig, walletName, statechainId, toAddress, feeRate) => {

    let wallet = storageManager.getItem(walletName);

    let backupTxs = storageManager.getItem(statechainId);

    if (backupTxs.length === 0) {
        throw new Error(`There is no backup transaction for the statechain id ${statechainId}`);
    }

    const new_tx_n = backupTxs.length + 1;

    const serverInfo = await utils.infoConfig(clientConfig);

    if (!feeRate) {
        feeRate = (serverInfo.feeRateSatsPerByte > clientConfig.maxFeeRate) ? clientConfig.maxFeeRate: serverInfo.feeRateSatsPerByte;
    } else {
        feeRate = parseInt(feeRate, 10);
    }

    let coinsWithStatechainId = wallet.coins.filter(c => {
        return c.statechain_id === statechainId
    });

    if (!coinsWithStatechainId) {
        throw new Error(`There is no coin for the statechain id ${statechainId}`);
    }

    // If the user sends to himself, he will have two coins with same statechain_id
    // In this case, we need to find the one with the lowest locktime
    // Sort the coins by locktime in ascending order and pick the first one
    let coin = coinsWithStatechainId.sort((a, b) => a.locktime - b.locktime)[0];

    if (coin.status != CoinStatus.CONFIRMED && coin.status != CoinStatus.IN_TRANSFER) {
        throw new Error(`Coin status must be CONFIRMED or IN_TRANSFER to transfer it. The current status is ${coin.status}`);
    }

    const isWithdrawal = true;
    const qtBackupTx = backupTxs.length;

    let signed_tx = await transaction.newTransaction(
        clientConfig, 
        coin, 
        toAddress, 
        isWithdrawal, 
        qtBackupTx, 
        null, 
        wallet.network,
        feeRate,
        serverInfo.initlock,
        serverInfo.interval);

    let backup_tx = {
        tx_n: new_tx_n,
        tx: signed_tx,
        client_public_nonce: coin.public_nonce,
        server_public_nonce: coin.server_public_nonce,
        client_public_key: coin.user_pubkey,
        server_public_key: coin.server_pubkey,
        blinding_factor: coin.blinding_factor
    };

    backupTxs.push(backup_tx);

    storageManager.setItem(coin.statechain_id, backupTxs, true);

    const url = `${clientConfig.esploraServer}/api/tx`;

    let response = await axios.post(url, signed_tx, {
        headers: {
            'Content-Type': 'text/plain'
        }
    });

    let txid = response.data;

    coin.tx_withdraw = txid;
    coin.withdrawal_address = toAddress;
    coin.status = CoinStatus.WITHDRAWING;

    const activity = utils.createActivity(txid, coin.amount, "Withdraw");

    wallet.activities.push(activity);

    storageManager.setItem(wallet.name, wallet, true);

    utils.completeWithdraw(clientConfig, coin.statechain_id, coin.signed_statechain_id);

    return txid;
}

export default { execute };