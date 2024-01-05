
import { generateMnemonic }  from 'mercury-wasm';

const createWallet = async (name) => {

    let block_header = await window.api.electrumRequest({
        method: 'blockchain.headers.subscribe',
        params: []
    });
    let blockheight = block_header.height;

    let serverInfo = await window.api.infoConfig();

    console.log('blockheight', blockheight);
    console.log('serverInfo', serverInfo);

    let configFile = await window.api.getConfigFile();

    let mnemonic = generateMnemonic();

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

    console.log('wallet', wallet);

    return wallet;
};

export default { createWallet };