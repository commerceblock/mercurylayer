import axios from 'axios';
import initWasm from 'mercury-wasm';
import wasmUrl from 'mercury-wasm/mercury_wasm_bg.wasm?url'
import * as mercury_wasm from 'mercury-wasm';
import storageManager from './storage_manager.js';
import utils from './utils.js';
import CoinStatus from './coin_enum.js';
import transaction from './transaction.js';


const newTransferAddress = async (walletName) => {

    await initWasm(wasmUrl);

    let wallet = storageManager.getItem(walletName);

    let coin = mercury_wasm.getNewCoin(wallet);

    wallet.coins.push(coin);

    storageManager.setItem(walletName, wallet, true);

    return coin.address;
}

const getMsgAddr = async (clientConfig, auth_pubkey) => {

    const statechain_entity_url = clientConfig.statechainEntity;
    const path = "transfer/get_msg_addr/";
    const url = statechain_entity_url + '/' + path + auth_pubkey;

    const response = await axios.get(url);

    return response.data.list_enc_transfer_msg;
}

const getTx0 = async (clientConfig, tx0_txid) => {

    let response = await axios.get(`${clientConfig.esploraServer}/api/tx/${tx0_txid}/hex`);

    return response.data;
}

const verifyTx0OutputIsUnspentAndConfirmed = async (clientConfig, tx0Outpoint, tx0Hex, wallet_network) => {

    let tx0outputAddress = mercury_wasm.getOutputAddressFromTx0(tx0Outpoint, tx0Hex, wallet_network);

    let response = await axios.get(`${clientConfig.esploraServer}/api/address/${tx0outputAddress}/utxo`);

    let utxo_list = response.data;

    let status = CoinStatus.UNCONFIRMED;

    for (let unspent of utxo_list) {
        if (unspent.txid === tx0Outpoint.txid && unspent.vout === tx0Outpoint.vout) {

            if (!unspent.status.confirmed) {
                status = CoinStatus.IN_MEMPOOL;
                break;
            }

            const response = await axios.get(`${clientConfig.esploraServer}/api/blocks/tip/height`);
            const block_header = response.data;
            const blockheight = parseInt(block_header, 10);

            if (isNaN(blockheight)) {
                throw new Error(`Invalid block height: ${block_header}`);
            }

            const confirmations = blockheight - parseInt(unspent.status.block_height, 10) + 1;

            const confirmationTarget = clientConfig.confirmationTarget;

            if (confirmations >= confirmationTarget) {
                status = CoinStatus.CONFIRMED;
            }
            
            return { result: true, status };
        }
    }

    return { result: false, status };
}

const unlockStatecoin = async (clientConfig, statechainId, signedStatechainId, authPubkey) => {

    const statechain_entity_url = clientConfig.statechainEntity;
    const path = "transfer/unlock";
    const url = statechain_entity_url + '/' + path;

    let transferUnlockRequestPayload = {
        statechain_id: statechainId,
        auth_sig: signedStatechainId,
        auth_pub_key: authPubkey,
    };

    const response = await axios.post(url, transferUnlockRequestPayload);

    if (response.status != 200) {
        throw new Error(`Failed to unlock transfer message`);
    }
}

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const sendTransferReceiverRequestPayload = async (clientConfig, transferReceiverRequestPayload) => {
 
    while(true) {
        try {
            const url = `${clientConfig.statechainEntity}/transfer/receiver`;
            const response = await axios.post(url, transferReceiverRequestPayload);
            return response.data.server_pubkey;
        }
        catch (error) {

            if (error.response.status == 400) {
                if (error.response.data.code == 'ExpiredBatchTimeError') {
                    throw new Error(`Failed to update transfer message ${error.response.data.message}`);
                } else  if (error.response.data.code == 'StatecoinBatchLockedError') {
                    console.log("Statecoin batch still locked. Waiting until expiration or unlock.");
                    await sleep(5000);
                    continue;
                }
            } else {
                throw new Error(`Failed to update transfer message ${JSON.stringify(error.response.data)}`);
            }
        }
    }
}

const processEncryptedMessage = async (clientConfig, coin, encMessage, network, serverInfo, activities) => {
    let clientAuthKey = coin.auth_privkey;
    let newUserPubkey = coin.user_pubkey;

    let transferMsg = mercury_wasm.decryptTransferMsg(encMessage, clientAuthKey);

    let tx0Outpoint = mercury_wasm.getTx0Outpoint(transferMsg.backup_transactions);

    const tx0Hex = await getTx0(clientConfig, tx0Outpoint.txid);

    const isTransferSignatureValid = mercury_wasm.verifyTransferSignature(newUserPubkey, tx0Outpoint, transferMsg);

    if (!isTransferSignatureValid) {
        throw new Error("Invalid transfer signature");
    }
    
    const statechainInfo = await utils.getStatechainInfo(clientConfig, transferMsg.statechain_id);

    if (statechainInfo == null) {
        throw new Error("Statechain info not found");
    }

    const isTx0OutputPubkeyValid = mercury_wasm.validateTx0OutputPubkey(statechainInfo.enclave_public_key, transferMsg, tx0Outpoint, tx0Hex, network);

    if (!isTx0OutputPubkeyValid) {
        throw new Error("Invalid tx0 output pubkey");
    }

    let latestBackupTxPaysToUserPubkey = mercury_wasm.verifyLatestBackupTxPaysToUserPubkey(transferMsg, newUserPubkey, network);

    if (!latestBackupTxPaysToUserPubkey) {
        throw new Error("Latest Backup Tx does not pay to the expected public key");
    }

    if (statechainInfo.num_sigs != transferMsg.backup_transactions.length) {
        throw new Error("num_sigs is not correct");
    }
    
    let isTx0OutputUnspent = await verifyTx0OutputIsUnspentAndConfirmed(clientConfig, tx0Outpoint, tx0Hex, network);
    if (!isTx0OutputUnspent.result) {
        throw new Error("tx0 output is spent or not confirmed");
    }

    const currentFeeRateSatsPerByte = serverInfo.feeRateSatsPerByte;

    const feeRateTolerance = clientConfig.feeRateTolerance;

    let isSignatureValid = mercury_wasm.validateSignatureScheme(
        transferMsg,
        statechainInfo,
        tx0Hex,
        feeRateTolerance, 
        currentFeeRateSatsPerByte,
        serverInfo.interval
    )

    if (!isSignatureValid.result) {
        throw new Error(`Invalid signature scheme, ${isSignatureValid.msg}`);
    }

    let previousLockTime = isSignatureValid.previousLockTime;

    const transferReceiverRequestPayload = mercury_wasm.createTransferReceiverRequestPayload(statechainInfo, transferMsg, coin);

    let signedStatechainIdForUnlock = mercury_wasm.signMessage(transferMsg.statechain_id, coin);

    await unlockStatecoin(clientConfig, transferMsg.statechain_id, signedStatechainIdForUnlock, coin.auth_pubkey);

    let serverPublicKeyHex = "";

    try {
        serverPublicKeyHex = await sendTransferReceiverRequestPayload(clientConfig, transferReceiverRequestPayload);
    } catch (error) {
        throw new Error(error);
    }

    let newKeyInfo = mercury_wasm.getNewKeyInfo(serverPublicKeyHex, coin, transferMsg.statechain_id, tx0Outpoint, tx0Hex, network);

    coin.server_pubkey = serverPublicKeyHex;
    coin.aggregated_pubkey = newKeyInfo.aggregate_pubkey;
    coin.aggregated_address = newKeyInfo.aggregate_address;
    coin.statechain_id = transferMsg.statechain_id;
    coin.signed_statechain_id = newKeyInfo.signed_statechain_id;
    coin.amount = newKeyInfo.amount;
    coin.utxo_txid = tx0Outpoint.txid;
    coin.utxo_vout = tx0Outpoint.vout;
    coin.locktime = previousLockTime;
    coin.status = isTx0OutputUnspent.status;

    let utxo = `${tx0Outpoint.txid}:${tx0Outpoint.vout}`;

    let activity = {
        utxo: utxo,
        amount: newKeyInfo.amount,
        action: "Receive",
        date: new Date().toISOString()
    };

    activities.push(activity);

    storageManager.setItem(transferMsg.statechain_id, transferMsg.backup_transactions, true);

    return transferMsg.statechain_id;
}

const execute = async (clientConfig, walletName) => {
    await initWasm(wasmUrl);

    let wallet = storageManager.getItem(walletName);

    const serverInfo = await utils.infoConfig(clientConfig);

    let uniqueAuthPubkeys = new Set();

    wallet.coins.forEach(coin => {
        uniqueAuthPubkeys.add(coin.auth_pubkey);
    });

    let encMsgsPerAuthPubkey = new Map();

    for (let authPubkey of uniqueAuthPubkeys) {
        try {
            let encMessages = await getMsgAddr(clientConfig, authPubkey);
            if (encMessages.length === 0) {
                console.log("No messages");
                continue;
            }

            encMsgsPerAuthPubkey.set(authPubkey, encMessages);
        } catch (err) {
            console.error(err);
        }
    }

    let receivedStatechainIds = [];

    let tempCoins = [...wallet.coins];
    let tempActivities = [...wallet.activities];

    for (let [authPubkey, encMessages] of encMsgsPerAuthPubkey.entries()) {

        for (let encMessage of encMessages) {

            let coin = tempCoins.find(coin => coin.auth_pubkey === authPubkey && coin.status === 'INITIALISED');

            if (coin) {
                try {
                    let statechainIdAdded = await processEncryptedMessage(clientConfig, coin, encMessage, wallet.network, serverInfo, tempActivities);

                    if (statechainIdAdded) {
                        receivedStatechainIds.push(statechainIdAdded);
                    }
                } catch (error) {
                    console.error(`Error: ${error.message}`);
                    continue;
                }

            } else {
                try {
                    let newCoin = await mercury_wasm.duplicateCoinToInitializedState(wallet, authPubkey);

                    if (newCoin) {
                        let statechainIdAdded = await processEncryptedMessage(clientConfig, newCoin, encMessage, wallet.network, serverInfo, tempActivities);

                        if (statechainIdAdded) {
                            tempCoins.push(newCoin);
                            receivedStatechainIds.push(statechainIdAdded);
                        }
                    }
                } catch (error) {
                    console.error(`Error: ${error.message}`);
                    continue;
                }
            }
        }
    }

    wallet.coins = [...tempCoins];
    wallet.activities = [...tempActivities];

    storageManager.setItem(walletName, wallet, true);

    return receivedStatechainIds;
}

export default { newTransferAddress, execute }