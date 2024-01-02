import axios from 'axios';
import { updateWallet, getWallet } from './sqlite_manager';
import mercury_wasm from 'mercury-wasm';
import config from 'config';
import SocksProxyAgentLib from 'socks-proxy-agent';

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

    await updateWallet(db, wallet);

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

    await updateWallet(db, wallet);
}

const getDepositBitcoinAddress = async (db, wallet_name, token_id, amount) => {

    let wallet = await getWallet(db, wallet_name);

    await init(db, wallet, token_id);

    let coin = wallet.coins[wallet.coins.length - 1];

    let aggregatedPublicKey = mercury_wasm.createAggregatedAddress(coin, wallet.network);

    coin.amount = parseInt(amount, 10);
    coin.aggregated_address = aggregatedPublicKey.aggregate_address;
    coin.aggregated_pubkey = aggregatedPublicKey.aggregate_pubkey;

    await updateWallet(db, wallet);

    return { "deposit_address":  coin.aggregated_address, "statechain_id": coin.statechain_id, "wallet": wallet };
}

const getDepositAddressInfo = async (db, wallet_name, amount) => {

    let token_id = await getToken();
    let deposit_address_info = await getDepositBitcoinAddress(db, wallet_name, token_id, amount);

    return deposit_address_info;
}

export { getToken, getDepositAddressInfo };