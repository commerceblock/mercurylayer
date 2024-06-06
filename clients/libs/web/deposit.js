
import axios from 'axios';
import initWasm from 'mercury-wasm';
import wasmUrl from 'mercury-wasm/mercury_wasm_bg.wasm?url'
import * as mercury_wasm from 'mercury-wasm';
import storageManager from './storage_manager.js';
import transaction from './transaction.js';
import CoinStatus from './coin_enum.js';

const getTokenFromServer = async (clientConfig) => {

    const statechain_entity_url = clientConfig.statechainEntity;
    const path = "tokens/token_init";
    const url = statechain_entity_url + '/' + path;

    const response = await axios.get(url);

    if (response.status != 200) {
        throw new Error(`Token error: ${response.data}`);
    }

    let token = response.data;

    return token;
}

const getToken = async (clientConfig, walletName) => {

    let wallet = storageManager.getItem(walletName);
    
    let token = await getTokenFromServer(clientConfig);

    // for dev purposes
    token.confirmed = true;

    wallet.tokens.push(token);

    storageManager.setItem(walletName, wallet, true);

    return token;
}

const init = async (clientConfig, wallet, token_id) => {

    let coin = mercury_wasm.getNewCoin(wallet);    

    wallet.coins.push(coin);

    storageManager.setItem(wallet.name, wallet, true);

    let depositMsg1 = mercury_wasm.createDepositMsg1(coin, token_id);

    const statechain_entity_url = clientConfig.statechainEntity;
    const path = "deposit/init/pod";
    const url = statechain_entity_url + '/' + path;

    const response = await axios.post(url, depositMsg1);

    if (response.status != 200) {
        throw new Error(`Deposit error: ${response.data}`);
    }

    let depositMsg1Response = response.data;

    let depositInitResult = mercury_wasm.handleDepositMsg1Response(coin, depositMsg1Response);

    coin.statechain_id = depositInitResult.statechain_id;
    coin.signed_statechain_id = depositInitResult.signed_statechain_id;
    coin.server_pubkey = depositInitResult.server_pubkey;

    storageManager.setItem(wallet.name, wallet, true);
}

const getDepositBitcoinAddress = async (clientConfig, walletName, amount) => {

    await initWasm(wasmUrl);

    let wallet = storageManager.getItem(walletName);

    let foundToken = wallet.tokens.find(token => token.confirmed === true && token.spent === false);

    if (!foundToken) {
        throw new Error(`There is no token available`);
    }

    await init(clientConfig, wallet, foundToken.token_id);

    let coin = wallet.coins[wallet.coins.length - 1];

    let aggregatedPublicKey = mercury_wasm.createAggregatedAddress(coin, wallet.network);

    coin.amount = parseInt(amount, 10);
    coin.aggregated_address = aggregatedPublicKey.aggregate_address;
    coin.aggregated_pubkey = aggregatedPublicKey.aggregate_pubkey;

    foundToken.spent = true;

    storageManager.setItem(wallet.name, wallet, true);

    return { "deposit_address":  coin.aggregated_address, "statechain_id": coin.statechain_id };
}

const createTx1 = async (clientConfig, coin, walletNetwork, tx0Hash, tx0Vout) => {

    if (coin.status !== CoinStatus.INITIALISED) {
        throw new Error(`The coin with the aggregated address ${aggregated_address} is not in the INITIALISED state`);
    }

    if ('utxo_txid' in coin && 'input_vout' in coin) {
        throw new Error(`The coin with the aggregated address ${aggregated_address} has already been deposited`);
    }

    coin.utxo_txid = tx0Hash;
    coin.utxo_vout = tx0Vout;
    coin.status = CoinStatus.IN_MEMPOOL;

    const toAddress = mercury_wasm.getUserBackupAddress(coin, walletNetwork);
    const isWithdrawal = false;
    const qtBackupTx = 0;

    let signedTx = await transaction.newTransaction(clientConfig, coin, toAddress, isWithdrawal, qtBackupTx, null, walletNetwork);

    let backupTx = {
        tx_n: 1,
        tx: signedTx,
        client_public_nonce: coin.public_nonce,
        server_public_nonce: coin.server_public_nonce,
        client_public_key: coin.user_pubkey,
        server_public_key: coin.server_pubkey,
        blinding_factor: coin.blinding_factor
    };

    coin.locktime = mercury_wasm.getBlockheight(backupTx);

    return backupTx;
}

export default { getToken, getDepositBitcoinAddress, createTx1 }
