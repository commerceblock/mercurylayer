
import axios from 'axios';
import config from 'config';
import SocksProxyAgentLib from 'socks-proxy-agent';

const SocksProxyAgent = SocksProxyAgentLib.SocksProxyAgent;

const updateMsg =  async (transferUpdateMsgRequestPayload) => {
    const statechain_entity_url = config.get('statechainEntity');
    const path = "transfer/update_msg";
    const url = statechain_entity_url + '/' + path;

    const torProxy = config.get('torProxy');

    let socksAgent = undefined;

    if (torProxy) {
        socksAgent = { httpAgent: new SocksProxyAgent(torProxy) };
    }

    const response = await axios.post(url, transferUpdateMsgRequestPayload, socksAgent);

    return response.data.updated;
}

const getNewX1 = async (statechain_id, signed_statechain_id, new_auth_pubkey) => {

    const statechain_entity_url = config.get('statechainEntity');
    const path = "transfer/sender";
    const url = statechain_entity_url + '/' + path;

    let transferSenderRequestPayload = {
        statechain_id: statechain_id,
        auth_sig: signed_statechain_id,
        new_user_auth_key: new_auth_pubkey,
        batch_id: null,
    };

    const torProxy = config.get('torProxy');

    let socksAgent = undefined;

    if (torProxy) {
        socksAgent = { httpAgent: new SocksProxyAgent(torProxy) };
    }

    const response = await axios.post(url, transferSenderRequestPayload, socksAgent);

    return response.data.x1;
}

export default { updateMsg, getNewX1 };