import axios from 'axios';
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

export default { getToken, initPod };