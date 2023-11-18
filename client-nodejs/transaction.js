const axios = require('axios').default;
const mercury_wasm = require('mercury-wasm');
const utils = require('./utils');

const new_transaction = async(electrumClient, coin, toAddress, isWithdrawal, qtBackupTx, block_height, network) => {
    let coin_nonce = mercury_wasm.createAndCommitNonces(coin);

    let server_pubnonce = await signFirst(coin_nonce.sign_first_request_payload);

    coin.secret_nonce = coin_nonce.secret_nonce;
    coin.public_nonce = coin_nonce.public_nonce;
    coin.server_public_nonce = server_pubnonce;
    coin.blinding_factor = coin_nonce.blinding_factor;

    const serverInfo = await utils.infoConfig(electrumClient);

    let new_block_height = 0;
    if (block_height == null) {
        const block_header = await electrumClient.request('blockchain.headers.subscribe'); // request(promise)
        new_block_height = block_header.height;
    } else {
        new_block_height = block_height;
    }

    const initlock = serverInfo.initlock;
    const interval = serverInfo.interval;
    const feeRateSatsPerByte = serverInfo.fee_rate_sats_per_byte;

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

    const serverPartialSig = await signSecond(serverPartialSigRequest);

    const clientPartialSig = partialSigRequest.client_partial_sig;
    const msg = partialSigRequest.msg;
    const session = partialSigRequest.encoded_session;
    const outputPubkey = partialSigRequest.output_pubkey;

    const signature = mercury_wasm.createSignature(msg, clientPartialSig, serverPartialSig, session, outputPubkey);

    const encodedUnsignedTx = partialSigRequest.encoded_unsigned_tx;

    const signed_tx = mercury_wasm.newBackupTransaction(encodedUnsignedTx, signature);

    return signed_tx;
}

const signFirst = async (signFirstRequestPayload) => {

    const statechain_entity_url = 'http://127.0.0.1:8000';
    const path = "sign/first";
    const url = statechain_entity_url + '/' + path;
    
    let response = await axios.post(url, signFirstRequestPayload);

    let server_pubnonce_hex = response.data.server_pubnonce;

    if (server_pubnonce_hex.startsWith("0x")) {
        server_pubnonce_hex = server_pubnonce_hex.substring(2);
    }

    return server_pubnonce_hex;
}

const signSecond = async (partialSigRequest) => {

    const statechain_entity_url = 'http://127.0.0.1:8000';
    const path = "sign/second";
    const url = statechain_entity_url + '/' + path;

    let response = await axios.post(url, partialSigRequest);

    let server_partial_sig_hex = response.data.partial_sig;

    if (server_partial_sig_hex.startsWith("0x")) {
        server_partial_sig_hex = server_partial_sig_hex.substring(2);
    }

    return server_partial_sig_hex;
}

module.exports = { signFirst, signSecond, new_transaction };