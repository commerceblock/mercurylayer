import axios from 'axios';
import sqlite_manager from './sqlite_manager';
import mercury_wasm from 'mercury-wasm';
import config from 'config';
import utils from './utils';
import CoinStatus from './coin_enum';

import { getElectrumClient } from './electrumClient';

import bitcoinjs from "bitcoinjs-lib";
import ecc from "tiny-secp256k1";
import deposit from './deposit.js'

import SocksProxyAgentLib from 'socks-proxy-agent';

import transfer_receive from './transfer_receive';

const SocksProxyAgent = SocksProxyAgentLib.SocksProxyAgent;

const checkDeposit = async (electrumClient, coin, wallet_network) => {

    if (!coin.statechain_id && !coin.utxo_txid && !coin.utxo_vout) {
        if (coin.status != CoinStatus.INITIALISED) {
            throw new Error(`Coin does not have a statechain ID, a UTXO and the status is not INITIALISED`);
        } else {
            return null;
        }
    }

    bitcoinjs.initEccLib(ecc);

    const network = utils.getNetwork(wallet_network);

    let script = bitcoinjs.address.toOutputScript(coin.aggregated_address, network);
    let hash = bitcoinjs.crypto.sha256(script);
    let reversedHash = Buffer.from(hash.reverse());
    reversedHash = reversedHash.toString('hex');

    let utxo = null;

    let utxo_list = await electrumClient.request('blockchain.scripthash.listunspent', [reversedHash]);

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

    if (coin.status == CoinStatus.INITIALISED) {
        const utxo_txid = utxo.tx_hash;
        const utxo_vout = utxo.tx_pos;

        const backup_tx = await deposit.createTx1(electrumClient, coin, wallet_network, utxo_txid, utxo_vout);

        const activity_utxo = `${utxo_txid}:${utxo_vout}`;

        const activity = utils.createActivity(activity_utxo, coin.amount, "Deposit");

        depositResult = {
            activity,
            backup_tx
        };
    }

    if (utxo.height > 0) {

        const block_header = await electrumClient.request('blockchain.headers.subscribe');
        const blockheight = block_header.height;

        const confirmations = blockheight - utxo.height + 1;

        const confirmationTarget = config.get('confirmationTarget');

        coin.status = CoinStatus.UNCONFIRMED;

        if (confirmations >= confirmationTarget) {
            coin.status = CoinStatus.CONFIRMED;
        }
    }

    return depositResult;
}

const checkTransfer = async (coin) => {
    if (!coin.statechain_id) {
        throw new Error(`The coin with the aggregated address ${aggregated_address} does not have a statechain ID`);
    }

    const statechainEntityUrl = config.get('statechainEntity'); // 'http://127.0.0.1:8000';
    const path = `transfer/receiver/${coin.statechain_id}`;

    const torProxy = config.get('torProxy');

    let socksAgent = undefined;

    if (torProxy) {
        socksAgent = { httpAgent: new SocksProxyAgent(torProxy) };
    }

    let response = await axios.get(statechainEntityUrl + '/' + path, socksAgent);

    if (response.status != 200) {
        // TODO: return false so the process can continue to other coins
        throw new Error(`Error checking transfer: ${response.data.error}`);
    }

    return response.data.transfer_complete;
}

const checkWithdrawal = async (electrumClient, coin, wallet_network) => {

    let txid = undefined;

    if (coin.tx_withdraw) {
        txid = coin.tx_withdraw;
    }

    if (coin.tx_cpfp) {
        if (txid) {
            throw new Error(`Coin ${coin.aggregated_address} has both tx_withdraw and tx_cpfp`);
        }
        txid = coin.tx_cpfp;
    }

    if (!txid) {
        throw new Error(`Coin ${coin.aggregated_address} has neither tx_withdraw nor tx_cpfp`);
    }

    if (!coin.withdrawal_address) {
        throw new Error(`Coin ${coin.aggregated_address} has no withdrawal_address`);
    }

    bitcoinjs.initEccLib(ecc);

    const network = utils.getNetwork(wallet_network);

    let script = bitcoinjs.address.toOutputScript(coin.withdrawal_address, network);
    let hash = bitcoinjs.crypto.sha256(script);
    let reversedHash = Buffer.from(hash.reverse());
    reversedHash = reversedHash.toString('hex');

    let utxo = undefined;

    let utxo_list = await electrumClient.request('blockchain.scripthash.listunspent', [reversedHash]);

    for (let unspent of utxo_list) {
        if (unspent.tx_hash === txid) {
            utxo = unspent;
            break;
        }
    }

    if (!utxo) {
        // sometimes the transaction has not yet been transmitted to the specified Electrum server
        // throw new Error(`There is no UTXO with the address ${coin.withdrawal_address} and the txid ${txid}`);
        return false;
    }

    if (utxo.height > 0) {
        const block_header = await electrumClient.request('blockchain.headers.subscribe');
        const blockheight = block_header.height;

        const confirmations = blockheight - utxo.height + 1;

        const confirmationTarget = config.get('confirmationTarget');

        return confirmations >= confirmationTarget;
    }

    return false;
}

const updateWallet  = async (db, wallet) => {

    const electrumClient = await getElectrumClient();// connect(promise)

    const network = wallet.network;

    for (let i = 0; i < wallet.coins.length; i++) {
        let coin = wallet.coins[i];

        if (coin.status == CoinStatus.INITIALISED || coin.status == CoinStatus.IN_MEMPOOL || coin.status == CoinStatus.UNCONFIRMED) {

            let depositResult = await checkDeposit(electrumClient, coin, network);

            if (depositResult) {
                wallet.activities.push(depositResult.activity);
                await sqlite_manager.insertTransaction(db, coin.statechain_id, [depositResult.backup_tx]);
            }
        } else if (coin.status === CoinStatus.IN_TRANSFER) {
            let is_transferred = await checkTransfer(coin);

            if (is_transferred) {
                coin.status = CoinStatus.TRANSFERRED;
            }
        } else if (coin.status == CoinStatus.WITHDRAWING) {
            let is_withdrawn = await checkWithdrawal(electrumClient, coin, network);

            if (is_withdrawn) {
                coin.status = CoinStatus.WITHDRAWN;
            }
        }
    }

    await sqlite_manager.updateWallet(db, wallet);
}

const updateCoins  = async (db) => {
    let wallets = await sqlite_manager.getWallets(db);
    for (let wallet of wallets) {
        await updateWallet(db, wallet);
        await transfer_receive.execute(db, wallet);
    }
}

export default { updateCoins };