const axios = require('axios').default;
const { SocksProxyAgent } = require('socks-proxy-agent');
const bitcoinjs_lib = require("bitcoinjs-lib");
const config = require('config');

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

    // console.log("fee_rate_sats_per_byte: " + fee_rate_sats_per_byte);

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

const getNetwork = (wallet_network) => {
    switch(wallet_network) {
        case "signet":
            return bitcoinjs_lib.networks.testnet;
        case "testnet":
            return bitcoinjs_lib.networks.testnet;
        case "regtest":
            return bitcoinjs_lib.networks.regtest;
        case "mainnet":
            return bitcoinjs_lib.networks.bitcoin;
        default:
            throw new Error("Unknown network");
    }
}

const createActivity = (utxo, amount, action) => {

    const activity = {
        utxo,
        amount,
        action,
        date: new Date().toISOString()
    };

    return activity;

}

module.exports = { infoConfig, getNetwork, createActivity };
