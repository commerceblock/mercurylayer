const axios = require('axios').default;

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

module.exports = { signFirst, signSecond };