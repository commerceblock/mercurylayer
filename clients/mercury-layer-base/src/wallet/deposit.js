import axios from 'axios';
import config from 'config';
import SocksProxyAgentLib from 'socks-proxy-agent';

const SocksProxyAgent = SocksProxyAgentLib.SocksProxyAgent;

const checkToken = async (token_id) => {
    const statechain_entity_url = config.get('statechainEntity');
    const path = "token/token_verify/" + token_id;
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

    return token;
}

const confirmDebugToken = async (token_id) => {
    console.log('[deposit.js][confirmDebugToken]: token_id is equal to:', token_id);
    if (token_id == null) return;

    console.log('trying to confirm the token_id of', token_id);

    const statechain_entity_url = config.get('statechainEntity');
    const path = "token/token_confirm/" + token_id;
    const url = statechain_entity_url + '/' + path;

    console.log('[deposit.js][confirmDebugToken]: final url is:', url);

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

    return token;
}

const getRealToken = async () => {
    const statechain_entity_url = config.get('statechainEntity');
    const path = "token/token_init";
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

    return token;
}

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

const initPod = async (depositMsg1) => {

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

    return depositMsg1Response;
};

export default { getToken, initPod, getRealToken, checkToken, confirmDebugToken };