
const ElectrumCli = require('@mempool/electrum-client');

const deposit = require('./deposit');
const broadcast_backup_tx = require('./broadcast_backup_tx');
const withdraw = require('./withdraw');
const transfer_receive = require('./transfer_receive');
const transfer_send = require('./transfer_send');
const coin_status = require('./coin_status');
const lightningLatch = require('./lightning-latch');

const sqlite3 = require('sqlite3').verbose();

const sqlite_manager = require('./sqlite_manager');

const { v4: uuidv4 } = require('uuid');

const wallet_manager = require('./wallet');
const bitcoinjs = require("bitcoinjs-lib");

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

const broadcastBackupTransaction = async (clientConfig, walletName, statechainId, toAddress, feeRate) => {

    const db = await getDatabase(clientConfig);

    const electrumClient = await getElectrumClient(clientConfig);

    await coin_status.updateCoins(clientConfig, electrumClient, db, walletName);

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
        aggregated_address: coin.aggregated_address,
        locktime: coin.locktime,
        duplicate_index: coin.duplicate_index
    }));

    electrumClient.close();
    db.close();

    return coins;
}

const withdrawCoin = async (clientConfig, walletName, statechainId, toAddress, feeRate, duplicatedIndex) => {
    const db = await getDatabase(clientConfig);
    const electrumClient = await getElectrumClient(clientConfig);

    try {
        await coin_status.updateCoins(clientConfig, electrumClient, db, walletName);

        return await withdraw.execute(
            clientConfig, 
            electrumClient, 
            db, 
            walletName, 
            statechainId, 
            toAddress, 
            feeRate, 
            duplicatedIndex
        );
    } finally {
        await Promise.all([
            electrumClient.close(),
            db.close()
        ]);
    }
}

const newTransferAddress = async (clientConfig, walletName, generateBatchId) => {

    const db = await getDatabase(clientConfig);

    const addr = await transfer_receive.newTransferAddress(db, walletName)
    let res = {transfer_receive: addr};

    if (generateBatchId) {
        res.batchId = uuidv4();
    }

    db.close();

    return res;
}

const transferSend = async (clientConfig, walletName, statechainId, toAddress, forceSend, batchId) => {
    const db = await getDatabase(clientConfig);
    const electrumClient = await getElectrumClient(clientConfig);

    try {
        await coin_status.updateCoins(clientConfig, electrumClient, db, walletName);

        return await transfer_send.execute(
            clientConfig, 
            electrumClient, 
            db, 
            walletName, 
            statechainId, 
            toAddress, 
            forceSend, 
            batchId
        );
    } finally {
        await Promise.all([
            electrumClient.close(),
            db.close()
        ]);
    }
}

const transferReceive = async (clientConfig, walletName) => {
    
    const db = await getDatabase(clientConfig);
    const electrumClient = await getElectrumClient(clientConfig);

    try {
        await coin_status.updateCoins(clientConfig, electrumClient, db, walletName);

        return await transfer_receive.execute(clientConfig, electrumClient, db, walletName);
    } finally {
        await Promise.all([
            electrumClient.close(),
            db.close()
        ]);
    }
}

const paymentHash = async (clientConfig, walletName, statechainId) => {

    const db = await getDatabase(clientConfig);

    const electrumClient = await getElectrumClient(clientConfig);

    await coin_status.updateCoins(clientConfig, electrumClient, db, walletName);

    let paymentHash = await lightningLatch.createPreImage(clientConfig, db, walletName, statechainId);

    electrumClient.close();
    db.close();
    
    return paymentHash;
}

const confirmPendingInvoice = async (clientConfig, walletName, statechainId) => {

    const db = await getDatabase(clientConfig);

    const electrumClient = await getElectrumClient(clientConfig);

    await coin_status.updateCoins(clientConfig, electrumClient, db, walletName);

    await lightningLatch.confirmPendingInvoice(clientConfig, db, walletName, statechainId);

    electrumClient.close();
    db.close();
}

const retrievePreImage = async (clientConfig, walletName, statechainId, batchId) => {

    const db = await getDatabase(clientConfig);

    const electrumClient = await getElectrumClient(clientConfig);

    await coin_status.updateCoins(clientConfig, electrumClient, db, walletName);

    let preImage = await lightningLatch.retrievePreImage(clientConfig, db, walletName, statechainId, batchId);

    electrumClient.close();
    db.close();

    return preImage;
}

const verifyInvoice = async (clientConfig, batchId, paymentRequest) => {

    const decodedInvoice = bitcoinjs.decode(paymentRequest);
    let paymentHash = await getPaymentHash(clientConfig, batchId);
    
    return paymentHash === decodedInvoice.tagsObject.payment_hash;
}

const getPaymentHash = async (clientConfig, batchId) => {

    return await lightningLatch.getPaymentHash(clientConfig, batchId);
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
    transferReceive,
    paymentHash,
    confirmPendingInvoice,
    retrievePreImage,
    verifyInvoice,
    getPaymentHash
};
