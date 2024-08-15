import storageManager from './storage_manager.js';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import CoinStatus from './coin_enum.js';

const createPreImage  = async (clientConfig, walletName, statechainId) => {

    const batchId = uuidv4();

    const wallet = storageManager.getItem(walletName);

    const coinsWithStatechainId = wallet.coins.filter(c => {
        return c.statechain_id === statechainId
    });

    if (!coinsWithStatechainId || coinsWithStatechainId.length === 0) {
        throw new Error(`There is no coin for the statechain id ${statechainId}`);
    }

    // If the user sends to himself, he will have two coins with same statechain_id
    // In this case, we need to find the one with the lowest locktime
    // Sort the coins by locktime in ascending order and pick the first one
    const coin = coinsWithStatechainId.sort((a, b) => a.locktime - b.locktime)[0];

    if (coin.status != CoinStatus.CONFIRMED && coin.status != CoinStatus.IN_TRANSFER) {
        throw new Error(`Coin status must be CONFIRMED or IN_TRANSFER to transfer it. The current status is ${coin.status}`);
    }

    if (coin.locktime == null) {
        throw new Error("Coin.locktime is null");
    }

    const paymentHashPayload  = {
        statechain_id: statechainId,
        auth_sig: coin.signed_statechain_id,
        batch_id: batchId
    };

    const paymentHash = await sendPaymentHash(clientConfig, paymentHashPayload);

    return {
        hash: paymentHash,
        batchId: batchId
    };
}

const sendPaymentHash = async (clientConfig, paymentHashPayload) => {

    const url = `${clientConfig.statechainEntity}/transfer/paymenthash`;
    
    let response = await axios.post(url, paymentHashPayload);

    return response?.data?.hash;
}

const confirmPendingInvoice = async (clientConfig, walletName, statechainId) => {

    const wallet = storageManager.getItem(walletName);

    const coinsWithStatechainId = wallet.coins.filter(c => {
        return c.statechain_id === statechainId
    });

    if (!coinsWithStatechainId || coinsWithStatechainId.length === 0) {
        throw new Error(`There is no coin for the statechain id ${statechainId}`);
    }

    // If the user sends to himself, he will have two coins with same statechain_id
    // In this case, we need to find the one with the lowest locktime
    // Sort the coins by locktime in ascending order and pick the first one
    const coin = coinsWithStatechainId.sort((a, b) => a.locktime - b.locktime)[0];

    const transferUnlockRequestPayload = {
        statechain_id: statechainId,
        auth_sig: coin.signed_statechain_id,
        auth_pub_key: null
    };

    const url = `${clientConfig.statechainEntity}/transfer/unlock`;

    // If there is an http error an exception will be thrown
    await axios.post(url, transferUnlockRequestPayload);
}

const retrievePreImage = async (clientConfig, walletName, statechainId, batchId) => {

    const wallet = storageManager.getItem(walletName);

    const coinsWithStatechainId = wallet.coins.filter(c => {
        return c.statechain_id === statechainId
    });

    if (!coinsWithStatechainId || coinsWithStatechainId.length === 0) {
        throw new Error(`There is no coin for the statechain id ${statechainId}`);
    }

    // If the user sends to himself, he will have two coins with same statechain_id
    // In this case, we need to find the one with the lowest locktime
    // Sort the coins by locktime in ascending order and pick the first one
    const coin = coinsWithStatechainId.sort((a, b) => a.locktime - b.locktime)[0];

    const transferPreimageRequestPayload = {
        statechain_id: statechainId,
        auth_sig: coin.signed_statechain_id,
        previous_user_auth_key: coin.auth_pubkey,
        batch_id: batchId,
    };

    const url = `${clientConfig.statechainEntity}/transfer/transfer_preimage`;
    
    let response = await axios.post(url, transferPreimageRequestPayload);

    return { preimage: response?.data?.preimage };
}

const getPaymentHash = async (clientConfig, batchId) => {

    const url = `${clientConfig.statechainEntity}/transfer/paymenthash/${batchId}`;

    try {
        let response = await axios.get(url);

        return response?.data?.hash;

    } catch (error) {
        if (error.response.status == 401) {
            return null;
        } else {
            throw new Error(`Failed to retrieve payment hash: ${JSON.stringify(error.response.data)}`);
        }
    }

}

export default { createPreImage, confirmPendingInvoice, retrievePreImage, getPaymentHash};
