const axios = require('axios').default;
const { SocksProxyAgent } = require('socks-proxy-agent');
const transaction = require('./transaction');
const mercury_wasm = require('mercury-wasm');
const sqlite_manager = require('./sqlite_manager');
const { CoinStatus } = require('./coin_enum');
const utils = require('./utils');

const getDepositBitcoinAddress = async (clientConfig, db, wallet_name, amount) => {

    let wallet = await sqlite_manager.getWallet(db, wallet_name);

    let foundToken = wallet.tokens.find(token => token.confirmed === true && token.spent === false);

    if (!foundToken) {
        throw new Error(`There is no token available`);
    }

    await init(clientConfig, db, wallet, foundToken.token_id);

    let coin = wallet.coins[wallet.coins.length - 1];

    let aggregatedPublicKey = mercury_wasm.createAggregatedAddress(coin, wallet.network);

    coin.amount = parseInt(amount, 10);
    coin.aggregated_address = aggregatedPublicKey.aggregate_address;
    coin.aggregated_pubkey = aggregatedPublicKey.aggregate_pubkey;

    foundToken.spent = true;

    await sqlite_manager.updateWallet(db, wallet);

    return { "deposit_address":  coin.aggregated_address, "statechain_id": coin.statechain_id };
}

const createTx1 = async (clientConfig, electrumClient, coin, wallet_network, tx0_hash, tx0_vout) => {

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

    const serverInfo = await utils.infoConfig(clientConfig, electrumClient);

    let feeRateSatsPerByte = (serverInfo.fee_rate_sats_per_byte > clientConfig.maxFeeRate) ? clientConfig.maxFeeRate: serverInfo.fee_rate_sats_per_byte;

    let signed_tx = await transaction.new_transaction(
        clientConfig, 
        electrumClient, 
        coin, 
        toAddress, 
        isWithdrawal, 
        qtBackupTx, 
        null, 
        wallet_network,
        feeRateSatsPerByte,
        serverInfo.initlock,
        serverInfo.interval
    );

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

const init = async (clientConfig, db, wallet, token_id) => {

    let coin = mercury_wasm.getNewCoin(wallet);

    wallet.coins.push(coin);

    await sqlite_manager.updateWallet(db, wallet);

    // token_id = crypto.randomUUID().replace('-','');

    let depositMsg1 = mercury_wasm.createDepositMsg1(coin, token_id);

    const statechain_entity_url = clientConfig.statechainEntity;
    const path = "deposit/init/pod";
    const url = statechain_entity_url + '/' + path;

    const torProxy = clientConfig.torProxy;

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

const getTokenFromServer = async (clientConfig) => {

    const statechain_entity_url = clientConfig.statechainEntity;
    const path = "tokens/token_init";
    const url = statechain_entity_url + '/' + path;

    const torProxy = clientConfig.torProxy;

    let socksAgent = undefined;

    if (torProxy) {
        socksAgent = { httpAgent: new SocksProxyAgent(torProxy) };
    }

    const response = await axios.get(url, socksAgent);

    if (response.status != 200) {
        throw new Error(`Token error: ${response.data}`);
    }

    let token = response.data;

    return token;
}

const getToken = async (clientConfig, db, walletName) => {

    let wallet = await sqlite_manager.getWallet(db, walletName);
    
    let token = await getTokenFromServer(clientConfig);

    // for dev purposes
    token.confirmed = true;

    wallet.tokens.push(token);

    await sqlite_manager.updateWallet(db, wallet);

    return token;
}

module.exports = { getDepositBitcoinAddress, createTx1, getToken };