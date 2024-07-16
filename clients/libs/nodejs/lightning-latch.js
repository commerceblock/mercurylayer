const sqlite_manager = require('./sqlite_manager');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios').default;
const { SocksProxyAgent } = require('socks-proxy-agent');
const { CoinStatus } = require('./coin_enum');

const createPreImage  = async (clientConfig, db, walletName, statechainId) => {

    const batchId = uuidv4();

    let wallet = await sqlite_manager.getWallet(db, walletName);

    let coinsWithStatechainId = wallet.coins.filter(c => {
        return c.statechain_id === statechainId
    });

    if (!coinsWithStatechainId || coinsWithStatechainId.length === 0) {
        throw new Error(`There is no coin for the statechain id ${statechainId}`);
    }

    // If the user sends to himself, he will have two coins with same statechain_id
    // In this case, we need to find the one with the lowest locktime
    // Sort the coins by locktime in ascending order and pick the first one
    let coin = coinsWithStatechainId.sort((a, b) => a.locktime - b.locktime)[0];

    if (coin.status != CoinStatus.CONFIRMED && coin.status != CoinStatus.IN_TRANSFER) {
        throw new Error(`Coin status must be CONFIRMED or IN_TRANSFER to transfer it. The current status is ${coin.status}`);
    }

    if (coin.locktime == null) {
        throw new Error("Coin.locktime is null");
    }


    const signed_statechain_id = coin.signed_statechain_id;

    let paymentHashPayload  = {
        statechain_id: statechainId,
        auth_sig: signed_statechain_id,
        batch_id: batchId
    };

    let paymentHash = await sendPaymentHash(clientConfig, paymentHashPayload);

    return {
        preImage: paymentHash,
        batchId: batchId
    };
}

const sendPaymentHash = async (clientConfig, paymentHashPayload) => {

    const url = `${clientConfig.statechainEntity}/transfer/paymenthash`;
    const torProxy = clientConfig.torProxy;

    let socksAgent = undefined;

    if (torProxy) {
        socksAgent = { httpAgent: new SocksProxyAgent(torProxy) };
    }
    
    let response = await axios.post(url, paymentHashPayload, socksAgent);

    return response?.data?.hash;
}

const confirmPendingInvoice = async (clientConfig, db, walletName, statechainId) => {

    let wallet = await sqlite_manager.getWallet(db, walletName);

    let coinsWithStatechainId = wallet.coins.filter(c => {
        return c.statechain_id === statechainId
    });

    if (!coinsWithStatechainId || coinsWithStatechainId.length === 0) {
        throw new Error(`There is no coin for the statechain id ${statechainId}`);
    }

    // If the user sends to himself, he will have two coins with same statechain_id
    // In this case, we need to find the one with the lowest locktime
    // Sort the coins by locktime in ascending order and pick the first one
    let coin = coinsWithStatechainId.sort((a, b) => a.locktime - b.locktime)[0];

    const transferUnlockRequestPayload = {
        statechain_id: statechainId,
        auth_sig: coin.signed_statechain_id,
        auth_pub_key: null
    };

    const url = `${clientConfig.statechainEntity}/transfer/unlock`;
    const torProxy = clientConfig.torProxy;

    let socksAgent = undefined;

    if (torProxy) {
        socksAgent = { httpAgent: new SocksProxyAgent(torProxy) };
    }
    
    // If there is an http error an exception will be thrown
    await axios.post(url, transferUnlockRequestPayload, socksAgent);
}

module.exports = { createPreImage, confirmPendingInvoice };