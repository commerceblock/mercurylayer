import axios from 'axios';
import config from 'config';
import SocksProxyAgentLib from 'socks-proxy-agent';

import { electrumRequest } from './electrumClient';

const SocksProxyAgent = SocksProxyAgentLib.SocksProxyAgent;

import bitcoinjs from "bitcoinjs-lib";
import ecc from "tiny-secp256k1";

bitcoinjs.initEccLib(ecc);

const infoConfig = async () => {

    const statechain_entity_url = config.get('statechainEntity');
    const path = "info/config";

    let fee_rate_btc_per_kb = await electrumRequest('blockchain.estimatefee', [3]);

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

const getConfigFile = () => {
    return {
        statechainEntity: config.get('statechainEntity'),
        electrumServer: config.get('electrumServer'),
        network: config.get('network'),
        feeRateTolerance: config.get('feeRateTolerance'),
        databaseFile: config.get('databaseFile'),
        confirmationTarget: config.get('confirmationTarget'),
        torProxy: config.get('torProxy'),
    }
}

const getNetwork = (wallet_network) => {
    switch(wallet_network) {
        case "signet":
            return bitcoinjs.networks.testnet;
        case "testnet":
            return bitcoinjs.networks.testnet;
        case "regtest":
            return bitcoinjs.networks.regtest;
        case "mainnet":
            return bitcoinjs.networks.bitcoin;
        default:
            throw new Error("Unknown network");
    }
}

const convertAddressToReversedHash = (address, _network) => {
    
    const network = getNetwork(_network);

    let script = bitcoinjs.address.toOutputScript(address, network);
    let hash = bitcoinjs.crypto.sha256(script);
    let reversedHash = Buffer.from(hash.reverse());
    reversedHash = reversedHash.toString('hex');

    return reversedHash;
}

export { infoConfig, getConfigFile, convertAddressToReversedHash };