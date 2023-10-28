const axios = require('axios').default;

const signFirst = async (signFirstRequestPayload) => {

    const statechain_entity_url = 'http://127.0.0.1:8000';
    const path = "sign/first";
    const url = statechain_entity_url + '/' + path;
    
    let response = await axios.post(url, signFirstRequestPayload);

    return response.data.server_pubnonce;
}

module.exports = { signFirst };