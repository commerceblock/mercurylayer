const sqlite_manager = require('./sqlite_manager');
const mercury_wasm = require('mercury-wasm');
const transaction = require('./transaction');

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

    let signed_tx = await transaction.new_transaction(electrumClient, coin, toAddress, isWithdrawal, qtBackupTx, wallet.network);

    console.log("signed_tx: ", signed_tx);
}

module.exports = { execute };