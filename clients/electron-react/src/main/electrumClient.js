import ElectrumCli from '@mempool/electrum-client';
import config from 'config';

const urlElectrum = config.get('electrumServer');
const urlElectrumObject = new URL(urlElectrum);

const electrumPort = parseInt(urlElectrumObject.port, 10);
const electrumHostname = urlElectrumObject.hostname;  
const electrumProtocol = urlElectrumObject.protocol.slice(0, -1); // remove trailing ':'

const electrumClient = new ElectrumCli(electrumPort, electrumHostname, electrumProtocol); 

export const connectElectrumClient = async () => {
    await electrumClient.connect(); 
};

export const disconnectElectrumClient = () => {
    electrumClient.close();
};
  
export const getElectrumClient = async () => {
    try {
        await electrumClient.server_ping();
    }
    catch (e) {
        await electrumClient.connect();
    }

    return electrumClient;
}