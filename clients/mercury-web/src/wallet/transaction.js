
import axios from 'axios';
import config from 'config';
import SocksProxyAgentLib from 'socks-proxy-agent';

const SocksProxyAgent = SocksProxyAgentLib.SocksProxyAgent;

const signFirst = async (signFirstRequestPayload) => {

    const statechain_entity_url = config.get('statechainEntity');
    const path = "sign/first";
    const url = statechain_entity_url + '/' + path;

    const torProxy = config.get('torProxy');

    let socksAgent = undefined;

    if (torProxy) {
        socksAgent = { httpAgent: new SocksProxyAgent(torProxy) };
    }
    
    let response = await axios.post(url, signFirstRequestPayload, socksAgent);

    let server_pubnonce_hex = response.data.server_pubnonce;

    return server_pubnonce_hex;
}

const signSecond = async (partialSigRequest) => {

    const statechain_entity_url = config.get('statechainEntity');
    const path = "sign/second";
    const url = statechain_entity_url + '/' + path;

    const torProxy = config.get('torProxy');

    let socksAgent = undefined;

    if (torProxy) {
        socksAgent = { httpAgent: new SocksProxyAgent(torProxy) };
    }

    let response = await axios.post(url, partialSigRequest, socksAgent);

    let server_partial_sig_hex = response.data.partial_sig;

    return server_partial_sig_hex;
}

export default { signFirst, signSecond };