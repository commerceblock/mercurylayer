/*import bitcoinjs from "bitcoinjs-lib";

const getNetwork = (wallet_network) => {
    switch(wallet_network) {
        case "signet":
            return bitcoinjs.networks.testnet;
        case "testnet":
            return bitcoinjs.networks.testnet;
        case "regtest":
            return bitcoinjs.networks.regtest;
        case "mainnet":
            return bitcoinjs.networks.bitcoin;
        default:
            throw new Error("Unknown network");
    }
}

export default { getNetwork };*/

const createActivity = (utxo, amount, action) => {

    const activity = {
        utxo,
        amount,
        action,
        date: new Date().toISOString()
    };

    return activity;

}

export default { createActivity };