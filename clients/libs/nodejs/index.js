
const ElectrumCli = require('@mempool/electrum-client');

const deposit = require('./deposit');
const broadcast_backup_tx = require('./broadcast_backup_tx');
const withdraw = require('./withdraw');
const transfer_receive = require('./transfer_receive');
const transfer_send = require('./transfer_send');
const coin_status = require('./coin_status');

const sqlite3 = require('sqlite3').verbose();

const sqlite_manager = require('./sqlite_manager');

const { v4: uuidv4 } = require('uuid');

const wallet_manager = require('./wallet');

const getDatabase = async (clientConfig) => {
    const databaseFile = clientConfig.databaseFile;
    const db = new sqlite3.Database(databaseFile);
    await sqlite_manager.createTables(db);
    return db;
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

const createWallet = async (clientConfig, walletName) => {

    const db = await getDatabase(clientConfig);

    const electrumClient = await getElectrumClient(clientConfig);

    let wallet = await wallet_manager.createWallet(walletName, clientConfig, electrumClient);

    await sqlite_manager.insertWallet(db, wallet);

    electrumClient.close();
    db.close();

    return wallet;
}

const newToken = async (clientConfig, walletName) => {
    const db = await getDatabase(clientConfig);
    const token = await deposit.getToken(clientConfig, db, walletName);
    db.close();
    return token;
}

const getDepositBitcoinAddress = async (clientConfig, walletName, amount) => {
    const db = await getDatabase(clientConfig);
    const address_info = await deposit.getDepositBitcoinAddress(clientConfig, db, walletName, amount);
    db.close();
    return address_info;
}

const getWalletTokens = async (clientConfig, walletName) => {
    const db = await getDatabase(clientConfig);
    let wallet = await sqlite_manager.getWallet(db, walletName);
    db.close();
    return wallet.tokens;
}

const broadcastBackupTransaction = async (clientConfig, walletName, statechainId, toAddress, options) => {

    const db = await getDatabase(clientConfig);

    const electrumClient = await getElectrumClient(clientConfig);

    await coin_status.updateCoins(clientConfig, electrumClient, db, walletName);

    const feeRate = (options && options.fee_rate) || null;

    let txIds = await broadcast_backup_tx.execute(clientConfig, electrumClient, db, walletName, statechainId, toAddress, feeRate);

    electrumClient.close();
    db.close();

    return txIds;
}

const listStatecoins = async (clientConfig, walletName) => {

    const db = await getDatabase(clientConfig);

    const electrumClient = await getElectrumClient(clientConfig);

    await coin_status.updateCoins(clientConfig, electrumClient, db, walletName);

    let wallet = await sqlite_manager.getWallet(db, walletName);

    let coins = wallet.coins.map(coin => ({
        statechain_id: coin.statechain_id,
        amount: coin.amount,
        status: coin.status,
        adress: coin.address,
        locktime: coin.locktime
    }));

    electrumClient.close();
    db.close();

    return coins;
}

const withdrawCoin = async (clientConfig, walletName, statechainId, toAddress, options) => {

    const db = await getDatabase(clientConfig);

    const electrumClient = await getElectrumClient(clientConfig);

    await coin_status.updateCoins(clientConfig, electrumClient, db, walletName);

    const feeRate = (options && options.fee_rate) || null;

    const txId = await withdraw.execute(clientConfig, electrumClient, db, walletName, statechainId, toAddress, feeRate);

    electrumClient.close();
    db.close();

    return txId;
}

const newTransferAddress = async (clientConfig, walletName, options) => {

    const db = await getDatabase(clientConfig);

    const addr = await transfer_receive.newTransferAddress(db, walletName)
    let res = {transfer_receive: addr};

    if (options && options.generateBatchId) {
        const batchId = uuidv4();
        res.batch_id = batchId;
    }

    db.close();

    return res;
}

const transferSend = async (clientConfig, walletName, statechainId, toAddress, options) => {

    const db = await getDatabase(clientConfig);

    const electrumClient = await getElectrumClient(clientConfig);

    let batchId = (options && options.batchId)  || null;

    await coin_status.updateCoins(clientConfig, electrumClient, db, walletName);

    let coin = await transfer_send.execute(clientConfig, electrumClient, db, walletName, statechainId, toAddress, batchId);

    electrumClient.close();
    db.close();

    return coin;
}

const transferReceive = async (clientConfig, walletName) => {
    
    const db = await getDatabase(clientConfig);

    const electrumClient = await getElectrumClient(clientConfig);

    await coin_status.updateCoins(clientConfig, electrumClient, db, walletName);

    let received_statechain_ids = await transfer_receive.execute(clientConfig, electrumClient, db, walletName);

    electrumClient.close();
    db.close();

    return received_statechain_ids;
}

module.exports = { 
    createWallet, 
    newToken, 
    getDepositBitcoinAddress, 
    getWalletTokens, 
    broadcastBackupTransaction, 
    listStatecoins, 
    withdrawCoin, 
    newTransferAddress, 
    transferSend,
    transferReceive
};