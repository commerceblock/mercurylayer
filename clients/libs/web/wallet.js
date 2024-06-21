import axios from 'axios';
import init from 'mercury-wasm';
import wasmUrl from 'mercury-wasm/mercury_wasm_bg.wasm?url'
import * as mercury_wasm from 'mercury-wasm';
import utils from './utils.js';

const createWallet = async (clientConfig, name) => {

    await init(wasmUrl);

    const response = await axios.get(`${clientConfig.esploraServer}/api/blocks/tip/height`);

    const blockheight = response.data;

    let serverInfo = await utils.infoConfig(clientConfig);

    const urlElectrumObject = new URL(clientConfig.esploraServer);

    const electrumPort = "80";
    const electrumHost = urlElectrumObject.hostname;  
    const electrumProtocol = urlElectrumObject.protocol
    const electrumType = "esplora";

    let mnemonic = mercury_wasm.generateMnemonic();

    let settings = {
        network: clientConfig.network,
        block_explorerURL: null,
        torProxyHost: null,
        torProxyPort: null,
        torProxyControlPassword: null,
        torProxyControlPort: null,
        statechainEntityApi: clientConfig.statechainEntity,
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
        state_entity_endpoint: clientConfig.statechainEntity,
        electrum_endpoint: clientConfig.esploraServer,
        network: clientConfig.network,
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

export default { createWallet }
