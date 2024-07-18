
const util = require('node:util');
const ElectrumCli = require('@mempool/electrum-client');
const sqlite3 = require('sqlite3').verbose();
const mercurynodejslib = require('mercurynodejslib');
const exec = util.promisify(require('node:child_process').exec);
const assert = require('node:assert/strict');
const client_config = require('./client_config');
const sqlite_manager = require('../../libs/nodejs/sqlite_manager');

const removeDatabase = async () => {
    try {
        const clientConfig = client_config.load(); 
        const { stdout, stderr } = await exec(`rm ${clientConfig.databaseFile}`);
        // console.log('stdout:', stdout);
        // console.error('stderr:', stderr);
    } catch (e) {  
        console.error(e);
    }
}

const getDatabase = async (clientConfig) => {
    const databaseFile = clientConfig.databaseFile;
    const db = new sqlite3.Database(databaseFile);
    await sqlite_manager.createTables(db);
    return db;
}

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const createWallet = async (clientConfig, walletName) => {

    let wallet = await mercurynodejslib.createWallet(clientConfig, walletName);
    assert.equal(wallet.name, walletName);

    // TODO: add more assertions
}

const getElectrumClient = async (clientConfig) => {

    const urlElectrum = clientConfig.electrumServer;
    const urlElectrumObject = new URL(urlElectrum);

    const electrumPort = parseInt(urlElectrumObject.port, 10);
    const electrumHostname = urlElectrumObject.hostname;  
    const electrumProtocol = urlElectrumObject.protocol.slice(0, -1);

    const electrumClient = new ElectrumCli(electrumPort, electrumHostname, electrumProtocol);
    await electrumClient.connect();

    return electrumClient;
}

const generateBlock = async (numBlocks) => {
    const generateBlockCommand = `docker exec $(docker ps -qf "name=mercurylayer_bitcoind_1") bitcoin-cli -regtest -rpcuser=user -rpcpassword=pass generatetoaddress ${numBlocks} "bcrt1qgh48u8aj4jvjkalc28lqujyx2wveck4jsm59x9"`;
    await exec(generateBlockCommand);
    // console.log(`Generated ${numBlocks} blocks`);

    const clientConfig = client_config.load();
    const electrumClient = await getElectrumClient(clientConfig);
    const block_header = await electrumClient.request('blockchain.headers.subscribe');
    const blockheight = block_header.height;
    // console.log("Current block height: ", blockheight);
}

const depositCoin = async (clientConfig, wallet_name, amount, deposit_info) => {

    deposit_info["amount"] = amount;
    // console.log("deposit_coin: ", deposit_info);

    const amountInBtc = amount / 100000000;

    // Sending Bitcoin using bitcoin-cli
    try {
        const sendBitcoinCommand = `docker exec $(docker ps -qf "name=mercurylayer_bitcoind_1") bitcoin-cli -regtest -rpcuser=user -rpcpassword=pass sendtoaddress ${deposit_info.deposit_address} ${amountInBtc}`;
        await exec(sendBitcoinCommand);
        // console.log(`Sent ${amountInBtc} BTC to ${deposit_info.deposit_address}`);
        await generateBlock(3);
    } catch (error) {
        console.error('Error sending Bitcoin:', error.message);
        return;
    }
}

const disconnectMercuryServer = async () => {
    await exec("docker network disconnect mercurylayer_default mercurylayer_mercury_1");
}

const connectMercuryServer = async () => {
    await exec("docker network connect mercurylayer_default mercurylayer_mercury_1");
}

const disconnectElectr = async () => {
    await exec("docker network disconnect mercurylayer_default mercurylayer_electrs_1");
}

const connectElectr = async () => {
    await exec("docker network connect mercurylayer_default mercurylayer_electrs_1");
}

module.exports = { 
    removeDatabase, 
    getDatabase, 
    sleep, 
    createWallet, 
    getElectrumClient, 
    generateBlock, 
    depositCoin, 
    connectElectr, 
    disconnectElectr, 
    connectMercuryServer, 
    disconnectMercuryServer 
};
