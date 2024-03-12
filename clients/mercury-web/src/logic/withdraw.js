import CoinStatus from './coinEnum';
import transaction from './transaction';
import utils from './utils.js'

const execute = async (wallet, backupTxs, coin, toAddress, feeRate) => {

    let coinBackupTx = backupTxs.filter(b => b.statechain_id === coin.statechain_id);

    if (coinBackupTx.length === 0) {
        throw new Error(`There is no backup transaction for the statechain id ${coin.statechain_id}`);
    }

    let coinBackupTxs = coinBackupTx[0].backupTxs;

    if (coinBackupTxs.length === 0) {
        throw new Error(`There is no backup transaction for the statechain id ${statechainId}`);
    }

    const new_tx_n = coinBackupTxs.length + 1;

    if (!feeRate) {
        const serverInfo = await window.api.infoConfig();
        const feeRateSatsPerByte = serverInfo.fee_rate_sats_per_byte;
        feeRate = feeRateSatsPerByte;
    } else {
        feeRate = parseInt(feeRate, 10);
    }

    if (coin.status != CoinStatus.CONFIRMED) {
        throw new Error(`Coin status must be CONFIRMED to withdraw it. The current status is ${coin.status}`);
    }

    const isWithdrawal = true;
    const qtBackupTx = backupTxs.length;

    let updatedCoin = structuredClone(coin);

    let signed_tx = await transaction.newTransaction(updatedCoin, toAddress, isWithdrawal, qtBackupTx, null, wallet.network);

    let backup_tx = {
        tx_n: new_tx_n,
        tx: signed_tx,
        client_public_nonce: updatedCoin.public_nonce,
        server_public_nonce: updatedCoin.server_public_nonce,
        client_public_key: updatedCoin.user_pubkey,
        server_public_key: updatedCoin.server_pubkey,
        blinding_factor: updatedCoin.blinding_factor
    };

    let txid = await window.api.electrumRequest({
        method: 'blockchain.transaction.broadcast',
        params: [signed_tx]
    });

    updatedCoin.tx_withdraw = txid;
    updatedCoin.withdrawal_address = toAddress;
    updatedCoin.status = CoinStatus.WITHDRAWING;

    const activity = utils.createActivity(txid, updatedCoin.amount, "Withdraw");

    return { txid, activity, newBackupTx: backup_tx, updatedCoin, walletName: wallet.name };
}

export default { execute };