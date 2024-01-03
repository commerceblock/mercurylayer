import axios from 'axios';
import sqlite_manager from './sqlite_manager';
import mercury_wasm from 'mercury-wasm';
import config from 'config';
import SocksProxyAgentLib from 'socks-proxy-agent';
import CoinStatus from './coin_enum';
import transaction from './transaction';

const SocksProxyAgent = SocksProxyAgentLib.SocksProxyAgent;

const getToken = async () => {

    const statechain_entity_url = config.get('statechainEntity');
    const path = "deposit/get_token";
    const url = statechain_entity_url + '/' + path;

    const torProxy = config.get('torProxy');

    let socksAgent = undefined;

    if (torProxy) {
        socksAgent = { httpAgent: new SocksProxyAgent(torProxy) };
    }

    const response = await axios.get(url, socksAgent);

    if (response.status != 200) {
        throw new Error(`Token error: ${response.data}`);
    }

    let token = response.data;

    return token.token_id;
}

const init = async (db, wallet, token_id) => {
    let coin = mercury_wasm.getNewCoin(wallet);

    wallet.coins.push(coin);

    await sqlite_manager.updateWallet(db, wallet);

    // token_id = crypto.randomUUID().replace('-','');

    let depositMsg1 = mercury_wasm.createDepositMsg1(coin, token_id);

    const statechain_entity_url = config.get('statechainEntity');
    const path = "deposit/init/pod";
    const url = statechain_entity_url + '/' + path;

    const torProxy = config.get('torProxy');

    let socksAgent = undefined;

    if (torProxy) {
        socksAgent = { httpAgent: new SocksProxyAgent(torProxy) };
    }

    const response = await axios.post(url, depositMsg1, socksAgent);

    if (response.status != 200) {
        throw new Error(`Deposit error: ${response.data}`);
    }

    let depositMsg1Response = response.data;

    let depositInitResult = mercury_wasm.handleDepositMsg1Response(coin, depositMsg1Response);
    // console.log("depositInitResult:", depositInitResult);

    coin.statechain_id = depositInitResult.statechain_id;
    coin.signed_statechain_id = depositInitResult.signed_statechain_id;
    coin.server_pubkey = depositInitResult.server_pubkey;

    await sqlite_manager.updateWallet(db, wallet);
}

const getDepositBitcoinAddress = async (db, wallet_name, token_id, amount) => {

    let wallet = await sqlite_manager.getWallet(db, wallet_name);

    await init(db, wallet, token_id);

    let coin = wallet.coins[wallet.coins.length - 1];

    let aggregatedPublicKey = mercury_wasm.createAggregatedAddress(coin, wallet.network);

    coin.amount = parseInt(amount, 10);
    coin.aggregated_address = aggregatedPublicKey.aggregate_address;
    coin.aggregated_pubkey = aggregatedPublicKey.aggregate_pubkey;

    await sqlite_manager.updateWallet(db, wallet);

    return { "deposit_address":  coin.aggregated_address, "statechain_id": coin.statechain_id, "wallet": wallet };
}

const getDepositAddressInfo = async (db, wallet_name, amount) => {

    let token_id = await getToken();
    let deposit_address_info = await getDepositBitcoinAddress(db, wallet_name, token_id, amount);

    return deposit_address_info;
}

const createTx1 = async (electrumClient, coin, wallet_network, tx0_hash, tx0_vout) => {

    if (coin.status !== CoinStatus.INITIALISED) {
        throw new Error(`The coin with the aggregated address ${aggregated_address} is not in the INITIALISED state`);
    }

    if ('utxo_txid' in coin && 'input_vout' in coin) {
        throw new Error(`The coin with the aggregated address ${aggregated_address} has already been deposited`);
    }

    coin.utxo_txid = tx0_hash;
    coin.utxo_vout = tx0_vout;
    coin.status = CoinStatus.IN_MEMPOOL;

    const toAddress = mercury_wasm.getUserBackupAddress(coin, wallet_network);
    const isWithdrawal = false;
    const qtBackupTx = 0;

    let signed_tx = await transaction.new_transaction(electrumClient, coin, toAddress, isWithdrawal, qtBackupTx, null, wallet_network);

    let backup_tx = {
        tx_n: 1,
        tx: signed_tx,
        client_public_nonce: coin.public_nonce,
        server_public_nonce: coin.server_public_nonce,
        client_public_key: coin.user_pubkey,
        server_public_key: coin.server_pubkey,
        blinding_factor: coin.blinding_factor
    };

    coin.locktime = mercury_wasm.getBlockheight(backup_tx);

    return backup_tx;
}

export default { getToken, getDepositAddressInfo, createTx1 };