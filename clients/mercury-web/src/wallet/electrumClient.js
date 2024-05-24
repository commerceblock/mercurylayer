import ElectrumCli from '@mempool/electrum-client';
import config from 'config';

const urlElectrum = config.get('electrumServer');
const urlElectrumObject = new URL(urlElectrum);

const electrumPort = parseInt(urlElectrumObject.port, 10);
const electrumHostname = urlElectrumObject.hostname;  
const electrumProtocol = urlElectrumObject.protocol.slice(0, -1); // remove trailing ':'

const electrumClient = new ElectrumCli(electrumPort, electrumHostname, electrumProtocol); 

export const disconnectElectrumClient = () => {
    electrumClient.close();
};
  
export const electrumRequest = async (method, params) => {
    try {
        return await electrumClient.request(method, params);
    }
    catch (e) {
        await electrumClient.connect();
        return await electrumClient.request(method, params);
    }    
}