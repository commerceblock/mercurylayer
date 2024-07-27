import axios from 'axios';
import storageManager from './storage_manager.js';
import utils from './utils.js';
import CoinStatus from './coin_enum.js';
import transaction from './transaction.js';

const execute = async (clientConfig, walletName, statechainId, toAddress, feeRate, duplicatedIndex) => {

    let wallet = storageManager.getItem(walletName);

    let backupTxs = storageManager.getItem(statechainId);

    if (backupTxs.length === 0) {
        throw new Error(`There is no backup transaction for the statechain id ${statechainId}`);
    }

    const serverInfo = await utils.infoConfig(clientConfig);

    if (!feeRate) {
        feeRate = (serverInfo.feeRateSatsPerByte > clientConfig.maxFeeRate) ? clientConfig.maxFeeRate: serverInfo.feeRateSatsPerByte;
    } else {
        feeRate = parseFloat(feeRate);
    }

    let coin;

    if (!!duplicatedIndex) {
        coin = wallet.coins
            .filter(c => c.statechain_id === statechainId && c.status === CoinStatus.DUPLICATED && c.duplicate_index === duplicatedIndex)
            .reduce((min, current) => (current.locktime < min.locktime) ? current : min, { locktime: Infinity });
    } else {
        coin = wallet.coins
            .filter(c => c.statechain_id === statechainId && c.status !== CoinStatus.DUPLICATED)
            .reduce((min, current) => (current.locktime < min.locktime) ? current : min, { locktime: Infinity });
    }

    if (!coin || coin.locktime === Infinity) {
        if (duplicatedIndex !== undefined) {
            throw new Error(`No duplicated coins associated with this statechain ID and index ${duplicatedIndex} were found`);
        } else {
            throw new Error("No coins associated with this statechain ID were found");
        }
    }

    if (coin.status != CoinStatus.CONFIRMED && coin.status != CoinStatus.IN_TRANSFER && coin.status != CoinStatus.DUPLICATED) {
        throw new Error(`Coin status must be CONFIRMED or IN_TRANSFER or DUPLICATED to withdraw it. The current status is ${coin.status}`);
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

    const isThereMoreDuplicatedCoins = wallet.coins.some(coin => 
        (coin.status === CoinStatus.DUPLICATED || coin.status === CoinStatus.CONFIRMED) &&
        (duplicatedIndex === undefined || coin.duplicate_index !== duplicatedIndex)
    );

    if (!isThereMoreDuplicatedCoins) {
        utils.completeWithdraw(clientConfig, coin.statechain_id, coin.signed_statechain_id);
    }

    return txid;
}

export default { execute };