import axios from 'axios';
import initWasm from 'mercury-wasm';
import wasmUrl from 'mercury-wasm/mercury_wasm_bg.wasm?url'
import * as mercury_wasm from 'mercury-wasm';
import storageManager from './storage_manager.js';
import CoinStatus from './coin_enum.js';
import deposit from './deposit.js';
import utils from './utils.js';

const checkDeposit = async (clientConfig, coin, walletNetwork) => {

    if (!coin.statechain_id && !coin.utxo_txid && !coin.utxo_vout) {
        if (coin.status != CoinStatus.INITIALISED) {
            throw new Error(`Coin does not have a statechain ID, a UTXO and the status is not INITIALISED`);
        } else {
            return null;
        }
    }

    let response = await axios.get(`${clientConfig.esploraServer}/api/address/${coin.aggregated_address}/utxo`);

    let utxo_list = response.data;

    let utxo = null;

    for (let unspent of utxo_list) {
        if (unspent.value === coin.amount) {
            utxo = unspent;
            break;
        }
    }

    // No deposit found. No change in the coin status
    if (!utxo) {
        return null;
    }

    // IN_MEMPOOL. there is nothing to do
    if (utxo.status.confirmed == false && coin.status == CoinStatus.IN_MEMPOOL) {
        return null;
    }

    let depositResult = null;

    if (coin.status == CoinStatus.INITIALISED) {
        const utxo_txid = utxo.txid;
        const utxo_vout = utxo.vout;

        const backup_tx = await deposit.createTx1(clientConfig, coin, walletNetwork, utxo_txid, utxo_vout);

        const activity_utxo = `${utxo_txid}:${utxo_vout}`;

        const activity = utils.createActivity(activity_utxo, coin.amount, "Deposit");

        depositResult = {
            activity,
            backup_tx
        };
    }

    if (utxo.status.confirmed) {

        const response = await axios.get(`${clientConfig.esploraServer}/api/blocks/tip/height`);
        const block_header = response.data;
        const blockheight = parseInt(block_header, 10);

        if (isNaN(blockheight)) {
            throw new Error(`Invalid block height: ${block_header}`);
        }

        const confirmations = blockheight - parseInt(utxo.status.block_height, 10) + 1;

        const confirmationTarget = clientConfig.confirmationTarget;

        coin.status = CoinStatus.UNCONFIRMED;

        if (confirmations >= confirmationTarget) {
            coin.status = CoinStatus.CONFIRMED;
        }

    }

    return depositResult;

}

const checkTransfer = async (clientConfig, coin) => {

    if (!coin.statechain_id) {
        throw new Error(`The coin with the aggregated address ${coin.aggregated_address} does not have a statechain ID`);
    }

    let statechainInfo = await utils.getStatechainInfo(clientConfig, coin.statechain_id);

    // if the statechain info is not found, we assume the coin has been transferred
    if (!statechainInfo) {
        return true;
    }

    let enclavePublicKey = statechainInfo.enclave_public_key;

    let isTransferred = !mercury_wasm.isEnclavePubkeyPartOfCoin(coin, enclavePublicKey);

    return isTransferred;
}

const checkWithdrawal = async (clientConfig, coin) => {

    let txid = undefined;

    if (coin.tx_withdraw) {
        txid = coin.tx_withdraw;
    }

    if (coin.tx_cpfp) {
        if (txid) {
            throw new Error(`Coin ${coin.aggregated_address} has both tx_withdraw and tx_cpfp`);
        }
        txid = coin.tx_cpfp;
    }

    if (!txid) {
        throw new Error(`Coin ${coin.aggregated_address} has neither tx_withdraw nor tx_cpfp`);
    }

    if (!coin.withdrawal_address) {
        throw new Error(`Coin ${coin.aggregated_address} has no withdrawal_address`);
    }

    console.log(`${clientConfig.esploraServer}/api/address/${coin.withdrawal_address}/utxo`);

    let response = await axios.get(`${clientConfig.esploraServer}/api/address/${coin.withdrawal_address}/utxo`);

    let utxo_list = response.data;

    let utxo = null;

    for (let unspent of utxo_list) {
        if (unspent.txid === txid) {
            utxo = unspent;
            break;
        }
    }

    if (!utxo) {
        // sometimes the transaction has not yet been transmitted to the specified Electrum server
        // throw new Error(`There is no UTXO with the address ${coin.withdrawal_address} and the txid ${txid}`);
        return false;
    }

    if (utxo.status.confirmed) {

        const response = await axios.get(`${clientConfig.esploraServer}/api/blocks/tip/height`);
        const block_header = response.data;
        const blockheight = parseInt(block_header, 10);

        if (isNaN(blockheight)) {
            throw new Error(`Invalid block height: ${block_header}`);
        }

        const confirmations = blockheight - parseInt(utxo.status.block_height, 10) + 1;

        const confirmationTarget = clientConfig.confirmationTarget;

        return confirmations >= confirmationTarget;
    }

    return false;
}

const checkForDuplicated = async (clientConfig, existingCoins) => {

    const duplicatedCoinList = [];

    for (const coin of existingCoins) {

        if (![CoinStatus.IN_MEMPOOL, CoinStatus.UNCONFIRMED, CoinStatus.CONFIRMED].includes(coin.status)) {
            continue;
        }

        let response = await axios.get(`${clientConfig.esploraServer}/api/address/${coin.aggregated_address}/utxo`);

        let utxoList = response.data;

        let maxDuplicatedIndex = Math.max(
            ...existingCoins
            .filter(c => c.statechain_id === coin.statechain_id)
            .map(coin => coin.duplicate_index)
        );

        for (const unspent of utxoList) {

            const utxoExists = existingCoins.some(coin => 
                coin.utxo_txid === unspent.txid &&
                coin.utxo_vout === unspent.vout
            );

            if (utxoExists) {
                continue;
            }

            maxDuplicatedIndex++;

            const duplicatedCoin = {
                ...coin,
                status: CoinStatus.DUPLICATED,
                utxo_txid: unspent.txid,
                utxo_vout: unspent.vout,
                amount: unspent.value,
                duplicate_index: maxDuplicatedIndex
            };

            duplicatedCoinList.push(duplicatedCoin);
        }
    }

    return duplicatedCoinList;
}

const updateCoins = async (clientConfig, walletName) => {

    await initWasm(wasmUrl);

    let wallet = storageManager.getItem(walletName);

    const network = wallet.network;

    for (let i = 0; i < wallet.coins.length; i++) {
        let coin = wallet.coins[i];

        if (coin.status == CoinStatus.INITIALISED || coin.status == CoinStatus.IN_MEMPOOL || coin.status == CoinStatus.UNCONFIRMED) {

            let depositResult = await checkDeposit(clientConfig, coin, network);

            if (depositResult) {
                wallet.activities.push(depositResult.activity);
                storageManager.setItem(coin.statechain_id, [depositResult.backup_tx], false);
            }
        } else if (coin.status === CoinStatus.IN_TRANSFER) {
            let is_transferred = await checkTransfer(clientConfig, coin);

            if (is_transferred) {
                coin.status = CoinStatus.TRANSFERRED;
            }
        } else if (coin.status == CoinStatus.WITHDRAWING) {
            let is_withdrawn = await checkWithdrawal(clientConfig, coin, network);

            if (is_withdrawn) {
                coin.status = CoinStatus.WITHDRAWN;
            }
        }
    }

    const duplicatedCoins = await checkForDuplicated(clientConfig, wallet.coins);
    wallet.coins = [...wallet.coins, ...duplicatedCoins];

    storageManager.setItem(wallet.name, wallet, true);
}

export default { updateCoins }