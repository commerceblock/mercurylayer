import utils from './utils';
import { getElectrumClient } from './electrumClient';
import mercury_wasm from 'mercury-wasm';
import config from 'config';

const createWallet = async (name) => {

    const electrumClient = await getElectrumClient();

    let block_header = await electrumClient.request('blockchain.headers.subscribe'); // request(promise)
    let blockheight = block_header.height;

    let serverInfo = await utils.infoConfig(electrumClient);

    console.log("serverInfo:", serverInfo);

    let mnemonic = mercury_wasm.generateMnemonic();

    console.log("mnemonic:", mnemonic);

    let electrumEndpoint = config.get('electrumServer');
    let statechainEntityEndpoint = config.get('statechainEntity');
    let network = config.get('network');

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
}

export default { createWallet };