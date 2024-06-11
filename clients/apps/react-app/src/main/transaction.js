
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
    
    try {
        let response = await axios.post(url, signFirstRequestPayload, socksAgent);
        console.log('Response:', response.data);
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error('Error: Connection refused. The server at 0.0.0.0:8000 is not available.');
        } else {
            console.error('An error occurred:', error.message);
        }
    }
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

    try {
        let response = await axios.post(url, partialSigRequest, socksAgent);
        console.log('Response:', response.data);
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error('Error: Connection refused. The server at 0.0.0.0:8000 is not available.');
        } else {
            console.error('An error occurred:', error.message);
        }
    }
    let server_partial_sig_hex = response.data.partial_sig;

    return server_partial_sig_hex;
}

export default { signFirst, signSecond };