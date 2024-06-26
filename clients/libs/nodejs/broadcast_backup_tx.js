const mercury_wasm = require('mercury-wasm');

const sqlite_manager = require('./sqlite_manager');

const utils = require('./utils');

const { CoinStatus } = require('./coin_enum');

const execute = async (clientConfig, electrumClient, db, walletName, statechainId, toAddress, feeRate) => {

    let wallet = await sqlite_manager.getWallet(db, walletName);

    if (!feeRate) {
        let feeRateSatsPerByte = await electrumClient.request('blockchain.estimatefee', [3]);

        if (feeRateSatsPerByte <= 0) {
            feeRateSatsPerByte = 0.00001;
        }
        feeRateSatsPerByte = (feeRateSatsPerByte * 100000.0);

        feeRate = (feeRateSatsPerByte > clientConfig.maxFeeRate) ? clientConfig.maxFeeRate: feeRateSatsPerByte;
    } else {
        feeRate = parseInt(feeRate, 10);
    }

    let backupTxs = await sqlite_manager.getBackupTxs(db, statechainId);

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

    const blockHeader = await electrumClient.request('blockchain.headers.subscribe'); // request(promise)
    const currentBlockheight = blockHeader.height;

    if (currentBlockheight > coin.locktime)  {
        throw new Error(`The coin is expired. Coin locktime is ${coin.locktime} and current blockheight is ${currentBlockheight}`);
    }

    const backupTx = mercury_wasm.latestBackuptxPaysToUserpubkey(backupTxs, coin, wallet.network);

    if (!backupTx) {
        throw new Error(`There is no backup transaction for the statechain id ${statechainId}`);
    }

    const CpfpTx = mercury_wasm.createCpfpTx(backupTx, coin, toAddress, feeRate, wallet.network);

    let backupTxTxid = await electrumClient.request('blockchain.transaction.broadcast', [backupTx.tx]);
    // console.log(`Broadcasting backup transaction: ${backupTxTxid}`);

    let cpfpTxTxid = await electrumClient.request('blockchain.transaction.broadcast', [CpfpTx]);
    // console.log(`Broadcasting CPFP transaction: ${cpfpTxTxid}`);

    coin.tx_cpfp = cpfpTxTxid;
    coin.withdrawal_address = toAddress;
    coin.status = CoinStatus.WITHDRAWING;

    await sqlite_manager.updateWallet(db, wallet);

    utils.completeWithdraw(clientConfig, coin.statechain_id, coin.signed_statechain_id);

    return {
        backupTx: backupTxTxid,
        cpfpTx: cpfpTxTxid
    };
}

module.exports = { execute };