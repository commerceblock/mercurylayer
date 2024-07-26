const sqlite_manager = require('./sqlite_manager');
const utils = require('./utils');
const transaction = require('./transaction');
const { CoinStatus } = require('./coin_enum');

const execute = async (clientConfig, electrumClient, db, walletName, statechainId, toAddress, feeRate, duplicatedIndex) => {
    let wallet = await sqlite_manager.getWallet(db, walletName);

    const backupTxs = await sqlite_manager.getBackupTxs(db, statechainId);

    if (backupTxs.length === 0) {
        throw new Error(`There is no backup transaction for the statechain id ${statechainId}`);
    }

    const serverInfo = await utils.infoConfig(clientConfig, electrumClient);

    if (!feeRate) {
        feeRate = (serverInfo.fee_rate_sats_per_byte > clientConfig.maxFeeRate) ? clientConfig.maxFeeRate: serverInfo.fee_rate_sats_per_byte;
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

    let signed_tx = await transaction.new_transaction(
        clientConfig, 
        electrumClient, 
        coin, 
        toAddress, 
        isWithdrawal, 
        qtBackupTx, 
        null, 
        wallet.network,
        feeRate,
        serverInfo.initlock,
        serverInfo.interval
    );

    const txid = await electrumClient.request('blockchain.transaction.broadcast', [signed_tx]);

    coin.tx_withdraw = txid;
    coin.withdrawal_address = toAddress;
    coin.status = CoinStatus.WITHDRAWING;

    let activity = {
        utxo: txid,
        amount: coin.amount,
        action: "Withdraw",
        date: new Date().toISOString()
    };

    wallet.activities.push(activity);

    await sqlite_manager.updateWallet(db, wallet);

    const isThereMoreDuplicatedCoins = wallet.coins.some(coin => 
        (coin.status === CoinStatus.DUPLICATED || coin.status === CoinStatus.CONFIRMED) &&
        (duplicatedIndex === undefined || coin.duplicate_index !== duplicatedIndex)
    );

    if (!isThereMoreDuplicatedCoins) {
        await utils.completeWithdraw(clientConfig, coin.statechain_id, coin.signed_statechain_id);
    }

    return txid;
}

module.exports = { execute };