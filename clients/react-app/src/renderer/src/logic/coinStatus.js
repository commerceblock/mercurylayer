import CoinStatus from './coinEnum.js';
// import bitcoinjs from "bitcoinjs-lib";
// import ecc from "tiny-secp256k1";
import utils from './utils.js'
import deposit from './deposit.js'

const Actions = {
    DEPOSIT_CONFIMED: "DEPOSIT_CONFIMED",
    WITHDRAWAL_CONFIMED: "WITHDRAWAL_CONFIMED",
    TRANSFER_CONFIMED: "TRANSFER_CONFIMED"
};

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
            action: Actions.DEPOSIT_CONFIMED,
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
            action: Actions.DEPOSIT_CONFIMED,
            activity: (depositResult == null) ? null : depositResult.activity,
            backupTx: (depositResult == null) ? null : depositResult.backupTx,
            newCoin,
            walletName
        };
    }

    return depositResult;
}

const checkWithdrawal = async (coin, walletNetwork, walletName) => {

    let txid = undefined;

    if (coin.tx_withdraw) {
        txid = coin.tx_withdraw;
    }

    if (coin.tx_cpfp) {
        if (txid) {
            console.error(`Coin ${coin.aggregated_address} has both tx_withdraw and tx_cpfp`);
        }
        txid = coin.tx_cpfp;
    }

    if (!txid) {
        console.error(`Coin ${coin.aggregated_address} has neither tx_withdraw nor tx_cpfp`);
    }

    if (!coin.withdrawal_address) {
        console.error(`Coin ${coin.aggregated_address} has no withdrawal_address`);
    }

    let reversedHash = await window.api.convertAddressToReversedHash({
        address: coin.withdrawal_address, 
        network: walletNetwork
    });

    let utxo = undefined;

    let utxo_list = await window.api.electrumRequest({
        method: 'blockchain.scripthash.listunspent',
        params: [reversedHash]
    });

    for (let unspent of utxo_list) {
        if (unspent.tx_hash === txid) {
            utxo = unspent;
            break;
        }
    }

    if (!utxo) {
        // sometimes the transaction has not yet been transmitted to the specified Electrum server
        // throw new Error(`There is no UTXO with the address ${coin.withdrawal_address} and the txid ${txid}`);
        return null;
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

        if (confirmations >= confirmationTarget) {
            let newCoin = structuredClone(coin);
            newCoin.status = CoinStatus.WITHDRAWN;
            return {
                action: Actions.WITHDRAWAL_CONFIMED,
                newCoin,
                walletName
            }
        }
    }

    return null;
}

const checkTransfer = async (coin, walletName) => {
    if (!coin.statechain_id) {
        // console.error(`The coin with the aggregated address ${coin.aggregated_address} does not have a statechain ID`);
        return null;
    }

    let isTransferred = await window.api.checkTransfer(coin.statechain_id);

    console.log("isTransferred", isTransferred);

    if (isTransferred) {
        let newCoin = structuredClone(coin);
        newCoin.status = CoinStatus.TRANSFERRED;
        return {
            action: Actions.TRANSFER_CONFIMED,
            newCoin,
            walletName
        }
    }

    return null;
}

const updateWallet  = async (wallet) => {

    let results = [];

    for (let i = 0; i < wallet.coins.length; i++) {
        let coin = wallet.coins[i];

        if (coin.status == CoinStatus.INITIALISED || coin.status == CoinStatus.IN_MEMPOOL || coin.status == CoinStatus.UNCONFIRMED) {
            let depositResult = await checkDeposit(coin, wallet.network, wallet.name);
            if (depositResult) {
                results.push(depositResult);
            }
        } else if (coin.status == CoinStatus.WITHDRAWING) {
            let withdrawalResult = await checkWithdrawal(coin, wallet.network, wallet.name);
            if (withdrawalResult) {
                results.push(withdrawalResult);
            }
        } else if (coin.status === CoinStatus.IN_TRANSFER) {
            let transferResult = await checkTransfer(coin, wallet.name);
            if (transferResult) {
                results.push(transferResult);
            }
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
    return results;
}

export default { updateCoins, Actions };