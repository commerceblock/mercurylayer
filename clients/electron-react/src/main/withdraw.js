import sqlite_manager from './sqlite_manager';
import utils from './utils';
import CoinStatus from './coin_enum';
import { getElectrumClient } from './electrumClient';
import transaction from './transaction';

const execute = async (db, walletName, statechainId, toAddress, feeRate) => {

    const electrumClient = await getElectrumClient();

    let wallet = await sqlite_manager.getWallet(db, walletName);

    const backupTxs = await sqlite_manager.getBackupTxs(db, statechainId);

    if (backupTxs.length === 0) {
        throw new Error(`There is no backup transaction for the statechain id ${statechainId}`);
    }

    const new_tx_n = backupTxs.length + 1;

    if (!feeRate) {
        const serverInfo = await utils.infoConfig(electrumClient);
        const feeRateSatsPerByte = serverInfo.fee_rate_sats_per_byte;
        feeRate = feeRateSatsPerByte;
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

    if (coin.status != CoinStatus.CONFIRMED) {
        throw new Error(`Coin status must be CONFIRMED to withdraw it. The current status is ${coin.status}`);
    }

    const isWithdrawal = true;
    const qtBackupTx = backupTxs.length;

    let signed_tx = await transaction.new_transaction(electrumClient, coin, toAddress, isWithdrawal, qtBackupTx, null, wallet.network);

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

    await sqlite_manager.updateTransaction(db, coin.statechain_id, backupTxs);

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

    return { txid, wallet };
}

export default { execute };