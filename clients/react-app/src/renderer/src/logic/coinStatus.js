import CoinStatus from './coinEnum.js';
// import bitcoinjs from "bitcoinjs-lib";
// import ecc from "tiny-secp256k1";
import utils from './utils.js'
import deposit from './deposit.js'

const checkDeposit = async (coin, walletNetwork, walletName) => {

    if (!coin.statechain_id && !coin.utxo_txid && !coin.utxo_vout) {
        if (coin.status != CoinStatus.INITIALISED) {
            // throw new Error(`Coin does not have a statechain ID, a UTXO and the status is not INITIALISED`);
            console.error(`Coin does not have a statechain ID, a UTXO and the status is not INITIALISED`);
            return null;
        } else {
            return null;
        }
    }

    let reversedHash = await window.api.convertAddressToReversedHash({
        address: coin.aggregated_address, 
        network: walletNetwork
    });

    let utxo = null;

    let utxo_list = await window.api.electrumRequest({
        method: 'blockchain.scripthash.listunspent',
        params: [reversedHash]
    });

    for (let unspent of utxo_list) {
        if (unspent.value === coin.amount) {
            utxo = unspent;
            break;
        }
    }

    // No deposit found. No change in the coin status
    if (!utxo) {
        return null;
    }

    // IN_MEMPOOL. there is nothing to do
    if (utxo.height == 0 && coin.status == CoinStatus.IN_MEMPOOL) {
        return null;
    }

    let depositResult = null;
    let newCoin = structuredClone(coin);

    if (coin.status == CoinStatus.INITIALISED) {

        const utxo_txid = utxo.tx_hash;
        const utxo_vout = utxo.tx_pos;

        const backupTx = await deposit.createTx1(newCoin, walletNetwork, utxo_txid, utxo_vout);

        const activity_utxo = `${utxo_txid}:${utxo_vout}`;

        const activity = utils.createActivity(activity_utxo, coin.amount, "Deposit");

        depositResult = {
            activity,
            backupTx,
            newCoin,
            walletName
        };
    }

    if (utxo.height > 0) {

        const block_header = await window.api.electrumRequest({
            method: 'blockchain.headers.subscribe',
            params: []
        });
        const blockheight = block_header.height;

        const confirmations = blockheight - utxo.height + 1;

        let configFile = await window.api.getConfigFile();

        const confirmationTarget = configFile.confirmationTarget;

        newCoin.status = CoinStatus.UNCONFIRMED;

        if (confirmations >= confirmationTarget) {
            newCoin.status = CoinStatus.CONFIRMED;
        }

        depositResult = {
            activity: (depositResult == null) ? null : depositResult.activity,
            backupTx: (depositResult == null) ? null : depositResult.backupTx,
            newCoin,
            walletName
        };
    }

    return depositResult;
}

const updateWallet  = async (wallet) => {

    let results = [];

    for (let i = 0; i < wallet.coins.length; i++) {
        let coin = wallet.coins[i];

        if (coin.status == CoinStatus.INITIALISED || coin.status == CoinStatus.IN_MEMPOOL || coin.status == CoinStatus.UNCONFIRMED) {
            let depositResult = await checkDeposit(coin, wallet.network, wallet.name);
            results.push(depositResult);

            console.log("depositResult", depositResult);
        }
    }

    return results;
}

const updateCoins  = async (wallets) => {
    let results = [];
    for (let wallet of wallets) {
        let result = await updateWallet(wallet);
        results.push(...result);
        // await transfer_receive.execute(db, wallet);
    }
    console.log("results", results);
    return results;
}

export default { updateCoins };