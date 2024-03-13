
import axios from 'axios';
import config from 'config';
import SocksProxyAgentLib from 'socks-proxy-agent';

const SocksProxyAgent = SocksProxyAgentLib.SocksProxyAgent;

const sendTransferReceiverRequestPayload = async (transferReceiverRequestPayload) => {

    const statechain_entity_url = config.get('statechainEntity');
    const path = "transfer/receiver";
    const url = statechain_entity_url + '/' + path;

    const torProxy = config.get('torProxy');

    let socksAgent = undefined;

    if (torProxy) {
        socksAgent = { httpAgent: new SocksProxyAgent(torProxy) };
    }

    const response = await axios.post(url, transferReceiverRequestPayload, socksAgent);

    return response.data.server_pubkey;
}

const getStatechainInfo = async (statechainId) => {

    const statechainEntityUrl = config.get('statechainEntity');
    const path = `info/statechain/${statechainId}`;

    const torProxy = config.get('torProxy');

    let socksAgent = undefined;

    if (torProxy) {
        socksAgent = { httpAgent: new SocksProxyAgent(torProxy) };
    }

    let response = await axios.get(statechainEntityUrl + '/' + path, socksAgent);

    return response.data;
}

const getMsgAddr = async (authPubkey) => {

    const statechain_entity_url = config.get('statechainEntity');
    const path = "transfer/get_msg_addr/";
    const url = statechain_entity_url + '/' + path + authPubkey;

    const torProxy = config.get('torProxy');

    let socksAgent = undefined;

    if (torProxy) {
        socksAgent = { httpAgent: new SocksProxyAgent(torProxy) };
    }

    const response = await axios.get(url, socksAgent);

    return response.data.list_enc_transfer_msg;
}

export default { sendTransferReceiverRequestPayload, getStatechainInfo, getMsgAddr };