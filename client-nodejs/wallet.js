const utils = require('./utils');

const mercury_wasm = require('mercury-wasm');

const createWallet = async (name, electrumClient, electrumEndpoint, statechainEntityEndpoint, network) => {

    let block_header = await electrumClient.request('blockchain.headers.subscribe'); // request(promise)
    let blockheight = block_header.height;

    let serverInfo = await utils.infoConfig(electrumClient);

    let mnemonic = mercury_wasm.generateMnemonic();
    
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
        activity: [],
        coins: []
    };

    return wallet;
}

module.exports = { createWallet };
