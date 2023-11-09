const mercury_wasm = require('mercury-wasm');

const sqlite_manager = require('./sqlite_manager');

const utils = require('./utils');

const { CoinStatus } = require('./coin_status');

const execute = async (electrumClient, db, walletName, statechainId, toAddress, feeRate) => {

    let wallet = await sqlite_manager.getWallet(db, walletName);

    if (!feeRate) {
        const serverInfo = await utils.infoConfig(electrumClient);
        const feeRateSatsPerByte = serverInfo.fee_rate_sats_per_byte;
        feeRate = feeRateSatsPerByte;
    } else {
        feeRate = parseInt(feeRate, 10);
    }

    console.log("feeRate: ", feeRate);

    let backupTxs = await sqlite_manager.getBackupTxs(db, statechainId);
    
    const backupTx = backupTxs.length === 0 ? null : backupTxs.reduce((prev, current) => (prev.tx_n > current.tx_n) ? prev : current);

    if (!backupTx) {
        throw new Error(`There is no backup transaction for the statechain id ${statechainId}`);
    }

    console.log("backupTx", backupTx);

    let coin = wallet.coins.filter(c => {
        return c.statechain_id === statechainId
    });

    if (!coin) {
        throw new Error(`There is no coin for the statechain id ${statechainId}`);
    }

    coin = coin[0];

    console.log("coin", coin);

    const cpfp_tx = mercury_wasm.createCpfpTx(backupTx, coin, toAddress, feeRate, wallet.network);

    let txid = await electrumClient.request('blockchain.transaction.broadcast', [backupTx.tx]);
    console.log(`Broadcasting backup transaction: ${txid}`);

    txid = await electrumClient.request('blockchain.transaction.broadcast', [cpfp_tx]);
    console.log(`Broadcasting CPFP transaction: ${txid}`);

    coin.tx_cpfp = txid;
    coin.status = CoinStatus.WITHDRAWING;

    await sqlite_manager.updateWallet(db, wallet);
}

module.exports = { execute };