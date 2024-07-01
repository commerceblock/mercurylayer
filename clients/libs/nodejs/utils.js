const axios = require('axios').default;
const { SocksProxyAgent } = require('socks-proxy-agent');
const bitcoinjs_lib = require("bitcoinjs-lib");

const infoConfig = async (clientConfig, ecl) => {

    const statechain_entity_url = clientConfig.statechainEntity;
    const path = "info/config";

    let fee_rate_btc_per_kb = await ecl.request('blockchain.estimatefee', [3]); // request(promise)

    // console.log("fee_rate_btc_per_kb:", fee_rate_btc_per_kb);

    // Why does it happen?
    if (fee_rate_btc_per_kb <= 0) {
        fee_rate_btc_per_kb = 0.00001;
    }
    const fee_rate_sats_per_byte = (fee_rate_btc_per_kb * 100000.0);

    // console.log("fee_rate_sats_per_byte: " + fee_rate_sats_per_byte);

    const torProxy = clientConfig.torProxy;

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
        case "bitcoin":
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

const getStatechainInfo = async (clientConfig, statechainId) => {

    const statechainEntityUrl = clientConfig.statechainEntity;
    const path = `info/statechain/${statechainId}`;

    const torProxy = clientConfig.torProxy;

    let socksAgent = undefined;

    if (torProxy) {
        socksAgent = { httpAgent: new SocksProxyAgent(torProxy) };
    }

    try {
        let response = await axios.get(statechainEntityUrl + '/' + path, socksAgent);
        return response.data;
    } catch (error) {
        if (error.response.status == 404) {
            return null;
        } else {
            throw error;
        }
    }
}

const completeWithdraw = async (clientConfig, statechainId, signedStatechainId) => {

    const statechainEntityUrl = clientConfig.statechainEntity;
    const path = "withdraw/complete";
    const url = statechainEntityUrl + '/' + path;

    const torProxy = clientConfig.torProxy;

    let socksAgent = undefined;

    if (torProxy) {
        socksAgent = { httpAgent: new SocksProxyAgent(torProxy) };
    }

    let deleteStatechainPayload = {
        statechain_id: statechainId,
        signed_statechain_id: signedStatechainId
    };

    await axios.post(url, deleteStatechainPayload, socksAgent);
}

module.exports = { infoConfig, getNetwork, createActivity, getStatechainInfo, completeWithdraw };
