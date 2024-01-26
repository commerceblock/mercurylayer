
import * as mercury_wasm from 'mercury-wasm';
import transaction from './transaction';
import CoinStatus from './coinEnum.js';

const newTokenID = async () => {
    let token_id = await window.api.getToken();
    return token_id;
}

const newAddress = async (wallet, amount, token_id) => {

    //let token_id = await window.api.getToken();

    const coin = mercury_wasm.getNewCoin(wallet);

    const depositMsg1 = mercury_wasm.createDepositMsg1(coin, token_id);

    const depositMsg1Response = await window.api.initPod(depositMsg1);

    const depositInitResult = mercury_wasm.handleDepositMsg1Response(coin, depositMsg1Response);

    coin.statechain_id = depositInitResult.statechain_id;
    coin.signed_statechain_id = depositInitResult.signed_statechain_id;
    coin.server_pubkey = depositInitResult.server_pubkey;

    let aggregatedPublicKey = mercury_wasm.createAggregatedAddress(coin, wallet.network);

    coin.amount = parseInt(amount, 10);
    coin.aggregated_address = aggregatedPublicKey.aggregate_address;
    coin.aggregated_pubkey = aggregatedPublicKey.aggregate_pubkey;

    return { coin, walletName: wallet.name };
}

const createTx1 = async (coin, wallet_network, tx0_hash, tx0_vout) => {

    if (coin.status !== CoinStatus.INITIALISED) {
        throw new Error(`The coin with the aggregated address ${aggregated_address} is not in the INITIALISED state`);
    }

    if ('utxo_txid' in coin && 'input_vout' in coin) {
        throw new Error(`The coin with the aggregated address ${aggregated_address} has already been deposited`);
    }

    coin.utxo_txid = tx0_hash;
    coin.utxo_vout = tx0_vout;
    coin.status = CoinStatus.IN_MEMPOOL;

    const toAddress = mercury_wasm.getUserBackupAddress(coin, wallet_network);
    const isWithdrawal = false;
    const qtBackupTx = 0;

    let signed_tx = await transaction.newTransaction(coin, toAddress, isWithdrawal, qtBackupTx, null, wallet_network);

    let backup_tx = {
        tx_n: 1,
        tx: signed_tx,
        client_public_nonce: coin.public_nonce,
        server_public_nonce: coin.server_public_nonce,
        client_public_key: coin.user_pubkey,
        server_public_key: coin.server_pubkey,
        blinding_factor: coin.blinding_factor
    };

    coin.locktime = mercury_wasm.getBlockheight(backup_tx);

    return backup_tx;
}

export default { newAddress, createTx1, newTokenID };
