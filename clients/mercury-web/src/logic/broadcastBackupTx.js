import * as mercury_wasm from 'mercury-wasm';
import CoinStatus from './coinEnum';

const execute = async (wallet, backupTxs, coin, toAddress, feeRate) => {

    if (coin.status != CoinStatus.CONFIRMED) {
        throw new Error(`Coin status must be CONFIRMED to broadcast the backup transaction. The current status is ${coin.status}`);
    }

    if (!feeRate) {
        const serverInfo = await window.api.infoConfig();
        const feeRateSatsPerByte = serverInfo.fee_rate_sats_per_byte;
        feeRate = feeRateSatsPerByte;
    } else {
        feeRate = parseInt(feeRate, 10);
    }

    let coinBackupTx = backupTxs.filter(b => b.statechain_id === coin.statechain_id);

    if (coinBackupTx.length === 0) {
        throw new Error(`There is no backup transaction for the statechain id ${coin.statechain_id}`);
    }

    let coinBackupTxs = coinBackupTx[0].backupTxs;

    let backupTx = coinBackupTxs.length === 0 ? null : coinBackupTxs.reduce((prev, current) => (prev.tx_n > current.tx_n) ? prev : current);

    const CpfpTx = mercury_wasm.createCpfpTx(backupTx, coin, toAddress, feeRate, wallet.network);

    await window.api.electrumRequest({
        method: 'blockchain.transaction.broadcast',
        params: [backupTx.tx]
    });

    let cpfpTxTxid = await window.api.electrumRequest({
        method: 'blockchain.transaction.broadcast',
        params: [CpfpTx]
    });

    let newCoin = structuredClone(coin);
    newCoin.tx_cpfp = cpfpTxTxid;
    newCoin.withdrawal_address = toAddress;
    newCoin.status = CoinStatus.WITHDRAWING;

    let activity = {
        utxo: cpfpTxTxid,
        amount: newCoin.amount,
        action: "Broadcasted backup transaction",
        date: new Date().toISOString()
    };

    return { newCoin, walletName: wallet.name, activity };
}

export default { execute };
