import * as mercury_wasm from 'mercury-wasm';
import CoinStatus from './coinEnum';
import utils from './utils.js'

const newTransferAddress = (wallet) => {
    let coin = mercury_wasm.getNewCoin(wallet);
    return { "newCoin": coin, "walletName": wallet.name };
}

const execute = async (wallets) => {

    const serverInfo = await window.api.infoConfig();

    let coins_updated = [];

    console.log("TransferReceive execute");
    for (const wallet of wallets) {
        for (let coin of wallet.coins) {

            if (coin.status != CoinStatus.INITIALISED) {
                continue;
            }

            if (coin.statechain_id) {
                continue;
            }

            // console.log("----\nuser_pubkey", coin.user_pubkey);
            // console.log("auth_pubkey", coin.auth_pubkey);
            // console.log("statechain_id", coin.statechain_id);
            // console.log("coin.amount", coin.amount);
            // console.log("coin.status", coin.status);

            let encMessages = await window.api.getMsgAddr(coin.auth_pubkey);

            console.log("encMessages", encMessages);

            if (encMessages.length == 0) {
                continue;
            }

            

            const new_coins_updated = await process_encrypted_message(coin, encMessages, wallet.network, serverInfo, wallet.name);
            coins_updated = [...coins_updated, ...new_coins_updated];
        }
    }

    return coins_updated;
}

const process_encrypted_message = async (coin, encMessages, network, serverInfo, walletName) => {
    let clientAuthKey = coin.auth_privkey;
    let newUserPubkey = coin.user_pubkey;

    let coins_updated = [];

    for (let encMessage of encMessages) {

        let transferMsg = mercury_wasm.decryptTransferMsg(encMessage, clientAuthKey);

        let tx0Outpoint = mercury_wasm.getTx0Outpoint(transferMsg.backup_transactions);

        const tx0Hex = await getTx0(tx0Outpoint.txid);

        const isTransferSignatureValid = mercury_wasm.verifyTransferSignature(newUserPubkey, tx0Outpoint, transferMsg);

        if (!isTransferSignatureValid) {
            console.error("Invalid transfer signature");
            continue;
        }

        const statechainInfo = await window.api.getStatechainInfo(transferMsg.statechain_id);

        console.log("statechainInfo", statechainInfo);
        console.log("transferMsg", transferMsg);
        console.log("tx0Outpoint", tx0Outpoint);
        console.log("tx0Hex", tx0Hex);
        console.log("network", network);

        const isTx0OutputPubkeyValid = mercury_wasm.validateTx0OutputPubkey(statechainInfo.enclave_public_key, transferMsg, tx0Outpoint, tx0Hex, network);

        if (!isTx0OutputPubkeyValid) {
            console.error("Invalid tx0 output pubkey");
            continue;
        }

        let latestBackupTxPaysToUserPubkey = mercury_wasm.verifyLatestBackupTxPaysToUserPubkey(transferMsg, newUserPubkey, network);

        if (!latestBackupTxPaysToUserPubkey) {
            console.error("Latest Backup Tx does not pay to the expected public key");
            continue;
        }

        if (statechainInfo.num_sigs != transferMsg.backup_transactions.length) {
            console.error("num_sigs is not correct");
            continue;
        }
        
        let isTx0OutputUnspent = await verifyTx0OutputIsUnspentAndConfirmed(coin, tx0Outpoint, tx0Hex, network);
        if (!isTx0OutputUnspent.result) {
            console.error("tx0 output is spent or not confirmed");
            continue;
        }

        let coinStatus = isTx0OutputUnspent.coinStatus;

        const currentFeeRateSatsPerByte = serverInfo.fee_rate_sats_per_byte;

        const configFile = await window.api.getConfigFile();

        const feeRateTolerance = configFile.feeRateTolerance;

        let previousLockTime = null;

        let sigSchemeValidation = true;

        for (const [index, backupTx] of transferMsg.backup_transactions.entries()) {

            const isSignatureValid = mercury_wasm.verifyTransactionSignature(backupTx.tx, tx0Hex, feeRateTolerance, currentFeeRateSatsPerByte);

            if (!isSignatureValid.result) {
                console.error(`Invalid signature, ${isSignatureValid.result.msg}`);
                sigSchemeValidation = false;
                break;
            }

            const currentStatechainInfo = statechainInfo.statechain_info[index];

            const isBlindedMusigSchemeValid = mercury_wasm.verifyBlindedMusigScheme(backupTx, tx0Hex, currentStatechainInfo);

            if (!isBlindedMusigSchemeValid.result) {
                console.error(`Invalid musig scheme, ${isBlindedMusigSchemeValid.result.msg}`);
                sigSchemeValidation = false;
                break;
            }

            if (previousLockTime != null) {
                let currentLockTime = mercury_wasm.getBlockheight(backupTx);
                if ((previousLockTime - currentLockTime) != serverInfo.interval) {
                    console.error("interval is not correct");
                    sigSchemeValidation = false;
                    break;
                }
            }

            previousLockTime = mercury_wasm.getBlockheight(backupTx);
        }

        if (!sigSchemeValidation) {
            console.error("Signature scheme validation failed");
            continue;
        }

        const transferReceiverRequestPayload = mercury_wasm.createTransferReceiverRequestPayload(statechainInfo, transferMsg, coin);

        let serverPublicKeyHex = await window.api.sendTransferReceiverRequestPayload(transferReceiverRequestPayload);

        let newKeyInfo = mercury_wasm.getNewKeyInfo(serverPublicKeyHex, coin, transferMsg.statechain_id, tx0Outpoint, tx0Hex, network);

        console.log("newKeyInfo", newKeyInfo);

        let updatedCoin = structuredClone(coin);
        
        updatedCoin.status = coinStatus;
        updatedCoin.server_pubkey = serverPublicKeyHex;
        updatedCoin.aggregated_pubkey = newKeyInfo.aggregate_pubkey;
        updatedCoin.aggregated_address = newKeyInfo.aggregate_address;
        updatedCoin.statechain_id = transferMsg.statechain_id;
        updatedCoin.signed_statechain_id = newKeyInfo.signed_statechain_id;
        updatedCoin.amount = newKeyInfo.amount;
        updatedCoin.utxo_txid = tx0Outpoint.txid;
        updatedCoin.utxo_vout = tx0Outpoint.vout;
        updatedCoin.locktime = previousLockTime;

        let utxo = `${tx0Outpoint.txid}:${tx0Outpoint.vout}`;

        const activity = utils.createActivity(utxo, newKeyInfo.amount, "Receive");

        coins_updated.push({
            updatedCoin,
            activity,
            backupTransactions: transferMsg.backup_transactions,
            walletName
        });
    }

    console.log("coins_updated", coins_updated);

    return coins_updated;
}

const getTx0 = async (tx0_txid) => {
    return await window.api.electrumRequest({
        method: 'blockchain.transaction.get',
        params: [tx0_txid]
    });
}

const verifyTx0OutputIsUnspentAndConfirmed = async (coin, tx0Outpoint, tx0Hex, walletNetwork) => {

    let tx0outputAddress = mercury_wasm.getOutputAddressFromTx0(tx0Outpoint, tx0Hex, walletNetwork);

    let reversedHash = await window.api.convertAddressToReversedHash({
        address: tx0outputAddress, 
        network: walletNetwork
    });

    let utxo_list = await window.api.electrumRequest({
        method: 'blockchain.scripthash.listunspent',
        params: [reversedHash]
    });

    for (let unspent of utxo_list) {
        if (unspent.tx_hash === tx0Outpoint.txid && unspent.tx_pos === tx0Outpoint.vout) {

            const block_header = await window.api.electrumRequest({
                method: 'blockchain.headers.subscribe',
                params: []
            });
            const blockheight = block_header.height;

            const confirmations = blockheight - unspent.height + 1;

            const configFile = await window.api.getConfigFile();

            const confirmationTarget = configFile.confirmationTarget;

            let coinStatus = CoinStatus.UNCONFIRMED;

            if (confirmations >= confirmationTarget) {
                coinStatus = CoinStatus.CONFIRMED;
            }
            
            return { result: true, coinStatus };
        }
    }

    return { result: false, coinStatus: null };
}

export default { newTransferAddress, execute };