import axios from 'axios';

const infoConfig = async (settings) => {

    const statechainEntityUrl = settings.statechainEntity;
    const path = "info/config";

    // Not working very well for signer
    // TODO: Uncommenting this when changing to mainnet or testnet
    /* let response = await axios.get(`${settings.esploraServer}/api/fee-estimates`);

    const feeRateSatsPerByte = response.data[3];

    console.log(`feeRateSatsPerByte: ${feeRateSatsPerByte}`) */

    let response = await axios.get(`${settings.esploraServer}/api/v1/fees/recommended`);
    
    const feeRateSatsPerByte = parseInt(response.data.fastestFee, 10);

    response = await axios.get(statechainEntityUrl + '/' + path);

    return {    
        initlock: response.data.initlock,
        interval: response.data.interval,
        feeRateSatsPerByte,
    };

}

const createActivity = (utxo, amount, action) => {

    const activity = {
        utxo,
        amount,
        action,
        date: new Date().toISOString()
    };

    return activity;
}

const completeWithdraw = async (clientConfig, statechainId, signedStatechainId) => {

    const url = `${clientConfig.statechainEntity}/withdraw/complete`;

    let deleteStatechainPayload = {
        statechain_id: statechainId,
        signed_statechain_id: signedStatechainId
    };

    await axios.post(url, deleteStatechainPayload);
}

export default { infoConfig, createActivity, completeWithdraw }