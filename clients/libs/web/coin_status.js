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
        console.log("utxo not found");
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

        console.log("utxo_txid: " + utxo_txid);
        console.log("utxo_vout: " + utxo_vout);

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
        }
    }

    storageManager.setItem(wallet.name, wallet, true);
}

export default { updateCoins }