
import axios from 'axios';
import initWasm from 'mercury-wasm';
import wasmUrl from 'mercury-wasm/mercury_wasm_bg.wasm?url'
import * as mercury_wasm from 'mercury-wasm';
import storageManager from './storage_manager.js';
import utils from './utils.js';

const signFirst = async (clientConfig, signFirstRequestPayload) => {

    const url = `${clientConfig.statechainEntity}/sign/first`;
    
    let response = await axios.post(url, signFirstRequestPayload);

    let serverPubnonceHex = response.data.server_pubnonce;

    if (serverPubnonceHex.startsWith("0x")) {
        serverPubnonceHex = serverPubnonceHex.substring(2);
    }

    return serverPubnonceHex;
}

const signSecond = async (clientConfig, partialSigRequest) => {

    const url = `${clientConfig.statechainEntity}/sign/second`;

    let response = await axios.post(url, partialSigRequest);

    let serverPartialSigHex = response.data.partial_sig;

    if (serverPartialSigHex.startsWith("0x")) {
        serverPartialSigHex = serverPartialSigHex.substring(2);
    }

    return serverPartialSigHex;
}

const newTransaction = async(clientConfig, coin, toAddress, isWithdrawal, qtBackupTx, block_height, network) => {

    await initWasm(wasmUrl);

    let coin_nonce = mercury_wasm.createAndCommitNonces(coin);

    let server_pubnonce = await signFirst(clientConfig, coin_nonce.sign_first_request_payload);

    coin.secret_nonce = coin_nonce.secret_nonce;
    coin.public_nonce = coin_nonce.public_nonce;
    coin.server_public_nonce = server_pubnonce;
    coin.blinding_factor = coin_nonce.blinding_factor;

    const serverInfo = await utils.infoConfig(clientConfig);

    let new_block_height = 0;
    if (block_height == null) {
        const response = await axios.get(`${clientConfig.esploraServer}/api/blocks/tip/height`);
        const block_header = response.data;
        new_block_height = parseInt(block_header, 10);

        if (isNaN(new_block_height)) {
            throw new Error(`Invalid block height: ${block_header}`);
        }
    } else {
        new_block_height = block_height;
    }

    const initlock = serverInfo.initlock;
    const interval = serverInfo.interval;
    const feeRateSatsPerByte = serverInfo.feeRateSatsPerByte;

    let partialSigRequest = mercury_wasm.getPartialSigRequest(
        coin,
        new_block_height,
        initlock, 
        interval,
        feeRateSatsPerByte,
        qtBackupTx,
        toAddress,
        network,
        isWithdrawal);

    const serverPartialSigRequest = partialSigRequest.partial_signature_request_payload;

    const serverPartialSig = await signSecond(clientConfig, serverPartialSigRequest);

    const clientPartialSig = partialSigRequest.client_partial_sig;
    const msg = partialSigRequest.msg;
    const session = partialSigRequest.encoded_session;
    const outputPubkey = partialSigRequest.output_pubkey;

    const signature = mercury_wasm.createSignature(msg, clientPartialSig, serverPartialSig, session, outputPubkey);

    const encodedUnsignedTx = partialSigRequest.encoded_unsigned_tx;

    const signed_tx = mercury_wasm.newBackupTransaction(encodedUnsignedTx, signature);

    return signed_tx;
}

export default { newTransaction }