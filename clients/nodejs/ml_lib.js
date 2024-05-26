
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

const config = require('config');

const getDatabase = async () => {
    const databaseFile = config.get('databaseFile');
    const db = new sqlite3.Database(databaseFile);
    await sqlite_manager.createTables(db);
    return db;
}

const getElectrumClient = async () => {

    const urlElectrum = config.get('electrumServer');
    const urlElectrumObject = new URL(urlElectrum);

    const electrumPort = parseInt(urlElectrumObject.port, 10);
    const electrumHostname = urlElectrumObject.hostname;  
    const electrumProtocol = urlElectrumObject.protocol.slice(0, -1);

    const electrumClient = new ElectrumCli(electrumPort, electrumHostname, electrumProtocol);
    await electrumClient.connect();

    return electrumClient;
}

const createWallet = async (walletName) => {

    const db = await getDatabase();

    await sqlite_manager.createTables(db);

    const electrumClient = await getElectrumClient();

    let wallet = await wallet_manager.createWallet(walletName, config, electrumClient);

    await sqlite_manager.insertWallet(db, wallet);

    electrumClient.close();
    db.close();

}

const newToken = async (walletName) => {
    const db = await getDatabase();
    const token = await deposit.getToken(db, walletName);
    db.close();
    return token;
}

const getDepositBitcoinAddress = async (walletName, amount) => {
    const db = await getDatabase();
    const address_info = await deposit.getDepositBitcoinAddress(db, walletName, amount);
    db.close();
    return address_info;
}

const getWalletTokens = async (walletName) => {
    const db = await getDatabase();
    let wallet = await sqlite_manager.getWallet(db, walletName);
    db.close();
    return wallet.tokens;
}

const broadcastBackupTransaction = async (walletName, statechainId, toAddress, options) => {

    const db = await getDatabase();

    const electrumClient = await getElectrumClient();

    await coin_status.updateCoins(electrumClient, db, walletName);

    let txIds = await broadcast_backup_tx.execute(electrumClient, db, walletName, statechainId, toAddress, options.fee_rate);

    electrumClient.close();
    db.close();

    return txIds;
}

const listStatecoins = async (walletName) => {

    const db = await getDatabase();

    const electrumClient = await getElectrumClient();

    await coin_status.updateCoins(electrumClient, db, walletName);

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

const withdrawCoin = async (walletName, statechainId, toAddress, options) => {

    const db = await getDatabase();

    const electrumClient = await getElectrumClient();

    await coin_status.updateCoins(electrumClient, db, walletName);

    const txId = await withdraw.execute(electrumClient, db, walletName, statechainId, toAddress, options.fee_rate);

    electrumClient.close();
    db.close();

    return txId;
}

const newTransferAddress = async (walletName, options) => {

    const db = await getDatabase();

    const addr = await transfer_receive.newTransferAddress(db, walletName)
    let res = {transfer_receive: addr};

    if (options.generateBatchId) {
        const batchId = uuidv4();
        res.batch_id = batchId;
    }

    db.close();

    return res;
}

const transferSend = async (walletName, statechainId, toAddress, options) => {

    const db = await getDatabase();

    const electrumClient = await getElectrumClient();

    let batchId = options.batchId  || null;

    await coin_status.updateCoins(electrumClient, db, walletName);

    let coin = await transfer_send.execute(electrumClient, db, walletName, statechainId, toAddress, batchId);

    electrumClient.close();
    db.close();

    return coin;
}

const transferReceive = async (walletName) => {
    
    const db = await getDatabase();

    const electrumClient = await getElectrumClient();

    await coin_status.updateCoins(electrumClient, db, walletName);

    let received_statechain_ids = await transfer_receive.execute(electrumClient, db, walletName);

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