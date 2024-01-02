import axios from 'axios';
import config from 'config';
import SocksProxyAgentLib from 'socks-proxy-agent';

const SocksProxyAgent = SocksProxyAgentLib.SocksProxyAgent;

const infoConfig = async (ecl) => {

    const statechain_entity_url = config.get('statechainEntity');
    const path = "info/config";

    let fee_rate_btc_per_kb = await ecl.request('blockchain.estimatefee', [3]); // request(promise)

    // console.log("fee_rate_btc_per_kb:", fee_rate_btc_per_kb);

    // Why does it happen?
    if (fee_rate_btc_per_kb <= 0) {
        fee_rate_btc_per_kb = 0.00001;
    }
    const fee_rate_sats_per_byte = (fee_rate_btc_per_kb * 100000.0);

    const torProxy = config.get('torProxy');

    let socksAgent = undefined;

    if (torProxy) {
        socksAgent = { httpAgent: new SocksProxyAgent(torProxy) };
    }

    let response = await axios.get(statechain_entity_url + '/' + path, socksAgent);
    return {    
        initlock: response.data.initlock,
        interval: response.data.interval,
        fee_rate_sats_per_byte,
    };
}

export { infoConfig };