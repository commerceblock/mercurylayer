import * as mercury_wasm from 'mercury-wasm';

const newTransaction = async(coin, toAddress, isWithdrawal, qtBackupTx, block_height, network) => {

    let coin_nonce = mercury_wasm.createAndCommitNonces(coin);

    let server_pubnonce = await window.api.signFirst(coin_nonce.sign_first_request_payload);

    if (server_pubnonce.startsWith("0x")) {
        server_pubnonce = server_pubnonce.substring(2);
    }

    coin.secret_nonce = coin_nonce.secret_nonce;
    coin.public_nonce = coin_nonce.public_nonce;
    coin.server_public_nonce = server_pubnonce;
    coin.blinding_factor = coin_nonce.blinding_factor;

    const serverInfo = await window.api.infoConfig();

    let new_block_height = 0;
    if (block_height == null) {
        let block_header = await window.api.electrumRequest({
            method: 'blockchain.headers.subscribe',
            params: []
        });
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

    let serverPartialSig = await window.api.signSecond(serverPartialSigRequest);

    if (serverPartialSig.startsWith("0x")) {
        serverPartialSig = serverPartialSig.substring(2);
    }

    const clientPartialSig = partialSigRequest.client_partial_sig;
    const msg = partialSigRequest.msg;
    const session = partialSigRequest.encoded_session;
    const outputPubkey = partialSigRequest.output_pubkey;

    const signature = mercury_wasm.createSignature(msg, clientPartialSig, serverPartialSig, session, outputPubkey);

    const encodedUnsignedTx = partialSigRequest.encoded_unsigned_tx;

    const signed_tx = mercury_wasm.newBackupTransaction(encodedUnsignedTx, signature);

    return signed_tx;
}

export default { newTransaction };
