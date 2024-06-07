import axios from 'axios';
import initWasm from 'mercury-wasm';
import wasmUrl from 'mercury-wasm/mercury_wasm_bg.wasm?url'
import * as mercury_wasm from 'mercury-wasm';
import storageManager from './storage_manager.js';
import utils from './utils.js';
import CoinStatus from './coin_enum.js';
import transaction from './transaction.js';


const newTransferAddress = async (walletName) => {

    await initWasm(wasmUrl);

    let wallet = storageManager.getItem(walletName);

    let coin = mercury_wasm.getNewCoin(wallet);

    wallet.coins.push(coin);

    storageManager.setItem(walletName, wallet, true);

    return coin.address;
}

export default { newTransferAddress }