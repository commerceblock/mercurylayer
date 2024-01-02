import { infoConfig } from './utils';
import ElectrumCli from '@mempool/electrum-client';
import mercury_wasm from 'mercury-wasm';

const createWallet = async (name) => {

    const urlElectrum = "tcp://signet-electrumx.wakiyamap.dev:50001";
    const urlElectrumObject = new URL(urlElectrum);

    const electrumPort = parseInt(urlElectrumObject.port, 10);
    const electrumHostname = urlElectrumObject.hostname;  
    const electrumProtocol = urlElectrumObject.protocol.slice(0, -1); // remove trailing ':'

    // const electrumClient = new ElectrumCli(50001, '127.0.0.1', 'tcp'); // tcp or tls
    const electrumClient = new ElectrumCli(electrumPort, electrumHostname, electrumProtocol); // tcp or tls
    await electrumClient.connect(); // connect(promise)

    let block_header = await electrumClient.request('blockchain.headers.subscribe'); // request(promise)
    let blockheight = block_header.height;

    let serverInfo = await infoConfig(electrumClient);

    electrumClient.close();

    console.log("serverInfo:", serverInfo);

    let mnemonic = mercury_wasm.generateMnemonic();

    console.log("mnemonic:", mnemonic);

    let electrumEndpoint = urlElectrum; // remove it later
    let statechainEntityEndpoint = "http://127.0.0.1:8000"; // remove it later
    let network = "signet"; // remove it later

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

export { createWallet };