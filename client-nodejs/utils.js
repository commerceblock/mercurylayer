const axios = require('axios').default;
const bitcoinjs_lib = require("bitcoinjs-lib");

const infoConfig = async (ecl) => {

    const statechain_entity_url = 'http://127.0.0.1:8000';
    const path = "info/config";

    let fee_rate_btc_per_kb = await ecl.request('blockchain.estimatefee', [3]); // request(promise)
    const fee_rate_sats_per_byte = (fee_rate_btc_per_kb * 100000.0);

    console.log("fee_rate_sats_per_byte: " + fee_rate_sats_per_byte);

    let response = await axios.get(statechain_entity_url + '/' + path);
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


module.exports = { infoConfig, getNetwork };
