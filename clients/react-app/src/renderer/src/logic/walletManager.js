
import * as mercury_wasm from 'mercury-wasm';

const createWallet = async (name) => {

    let block_header = await window.api.electrumRequest({
        method: 'blockchain.headers.subscribe',
        params: []
    });
    let blockheight = block_header.height;

    let serverInfo = await window.api.infoConfig();

    let configFile = await window.api.getConfigFile();

    let mnemonic = mercury_wasm.generateMnemonic();

    let electrumEndpoint = configFile.electrumServer;
    let statechainEntityEndpoint = configFile.statechainEntity;
    let network = configFile.network;

    let wallet = {
        name,
        mnemonic,
        version: "0.1.0",
        state_entity_endpoint: statechainEntityEndpoint,
        electrum_endpoint: electrumEndpoint,
        network: network,
        blockheight,
        initlock: serverInfo.initlock,
        interval: serverInfo.interval,
        tokens: [],
        activities: [],
        coins: []
    };

    return wallet;
};

export default { createWallet };