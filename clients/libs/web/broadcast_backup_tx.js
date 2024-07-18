import axios from 'axios';
import initWasm from 'mercury-wasm';
import wasmUrl from 'mercury-wasm/mercury_wasm_bg.wasm?url'
import * as mercury_wasm from 'mercury-wasm';
import storageManager from './storage_manager.js';
import utils from './utils.js';
import CoinStatus from './coin_enum.js';

const execute = async (clientConfig, walletName, statechainId, toAddress, feeRate) => {

    await initWasm(wasmUrl);

    let wallet = storageManager.getItem(walletName);

    let backupTxs = storageManager.getItem(statechainId);

    if (!feeRate) {
        const response = await axios.get(`${clientConfig.esploraServer}/api/fee-estimates`);
        const feeRateSatsPerByte = response.data[3];
        feeRate = (feeRateSatsPerByte > clientConfig.maxFeeRate) ? clientConfig.maxFeeRate: feeRateSatsPerByte;
    } else {
        feeRate = parseFloat(feeRate);
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

    const backupTx = mercury_wasm.latestBackuptxPaysToUserpubkey(backupTxs, coin, wallet.network);

    if (!backupTx) {
        throw new Error(`There is no backup transaction for the statechain id ${statechainId}`);
    }

    const CpfpTx = mercury_wasm.createCpfpTx(backupTx, coin, toAddress, feeRate, wallet.network);

    const url = `${clientConfig.esploraServer}/api/tx`;

    let response = await axios.post(url, backupTx.tx, {
        headers: {
            'Content-Type': 'text/plain'
        }
    });

    let backupTxTxid = response.data;

    response = await axios.post(url, CpfpTx, {
        headers: {
            'Content-Type': 'text/plain'
        }
    });

    let cpfpTxTxid = response.data;

    coin.tx_cpfp = cpfpTxTxid;
    coin.withdrawal_address = toAddress;
    coin.status = CoinStatus.WITHDRAWING;

    storageManager.setItem(walletName, wallet, true);

    utils.completeWithdraw(clientConfig, coin.statechain_id, coin.signed_statechain_id);

    return {
        backupTx: backupTxTxid,
        cpfpTx: cpfpTxTxid
    };
}

export default { execute };