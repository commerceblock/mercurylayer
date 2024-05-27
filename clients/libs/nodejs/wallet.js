const utils = require('./utils');

const mercury_wasm = require('mercury-wasm');

const createWallet = async (name, clientConfig, electrumClient) => {

    const urlElectrum = clientConfig.electrumServer;
    const urlElectrumObject = new URL(urlElectrum);

    const electrumPort = urlElectrumObject.port;
    const electrumHost = urlElectrumObject.hostname;  
    const electrumProtocol = urlElectrumObject.protocol.slice(0, -1);

    const electrumEndpoint = urlElectrum;
    const statechainEntityEndpoint = clientConfig.statechainEntity;
    const network = clientConfig.network;
    const electrumType = clientConfig.electrumType;

    let block_header = await electrumClient.request('blockchain.headers.subscribe');
    let blockheight = block_header.height;

    let serverInfo = await utils.infoConfig(clientConfig, electrumClient);

    let mnemonic = mercury_wasm.generateMnemonic();

    let settings = {
        network,
        block_explorerURL: null,
        torProxyHost: null,
        torProxyPort: null,
        torProxyControlPassword: null,
        torProxyControlPort: null,
        statechainEntityApi: statechainEntityEndpoint,
        torStatechainEntityApi: null,
        electrumProtocol,
        electrumHost,
        electrumPort,
        electrumType,
        notifications: false,
        tutorials: false
    }
    
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
        coins: [],
        settings
    };

    return wallet;
}

module.exports = { createWallet };
