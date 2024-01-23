
import * as mercury_wasm from 'mercury-wasm';
import * as crypto from 'crypto';

const createMnemonic = async () => {
    let mnemonic = mercury_wasm.generateMnemonic();
    return mnemonic;
}

const createPasswordHash = (password) => {
    let passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    return passwordHash;
}

const encryptString = (dataString, passwordHash) => {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(passwordHash, 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(dataString, 'utf-8', 'hex');
    encrypted += cipher.final('hex');

    return {
        iv: iv.toString('hex'),
        encryptedData: encrypted,
    };
}

const decryptString = (dataObject, passwordHash) => {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(passwordHash, 'hex');
    const iv = Buffer.from(dataObject.iv, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    let decrypted = decipher.update(dataObject.encryptedData, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');

    return decrypted;
}

const createWallet = async (name, mnemonic) => {

    let block_header = await window.api.electrumRequest({
        method: 'blockchain.headers.subscribe',
        params: []
    });
    let blockheight = block_header.height;

    let serverInfo = await window.api.infoConfig();

    let configFile = await window.api.getConfigFile();

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

export default { createWallet, createMnemonic, createPasswordHash, encryptString, decryptString };