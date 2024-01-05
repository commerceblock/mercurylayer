// import CoinStatus from './coinEnum.js';
// import bitcoinjs from "bitcoinjs-lib";
// import ecc from "tiny-secp256k1";
// import utils from './utils.js'

const checkDeposit = async (coin, wallet_network) => {

    if (!coin.statechain_id && !coin.utxo_txid && !coin.utxo_vout) {
        if (coin.status != CoinStatus.INITIALISED) {
            // throw new Error(`Coin does not have a statechain ID, a UTXO and the status is not INITIALISED`);
            console.error(`Coin does not have a statechain ID, a UTXO and the status is not INITIALISED`);
            return null;
        } else {
            return null;
        }
    }

    // bitcoinjs.initEccLib(ecc);

    // const network = utils.getNetwork(wallet_network);

    // let script = bitcoinjs.address.toOutputScript(coin.aggregated_address, network);
    // let hash = bitcoinjs.crypto.sha256(script);
    // let reversedHash = Buffer.from(hash.reverse());
    // reversedHash = reversedHash.toString('hex');

    // let utxo = null;

    // let utxo_list = await window.api.electrumRequest({
    //     method: 'blockchain.scripthash.listunspent',
    //     params: [reversedHash]
    // });

    // console.log('utxo_list', utxo_list);
}

const updateWallet  = async (wallet) => {
    for (let i = 0; i < wallet.coins.length; i++) {
        let coin = wallet.coins[i];

        if (coin.status == CoinStatus.INITIALISED || coin.status == CoinStatus.IN_MEMPOOL || coin.status == CoinStatus.UNCONFIRMED) {
            await checkDeposit(coin, wallet.network);
        }
    }
}

const updateCoins  = async (wallets) => {
    for (let wallet of wallets) {
        await updateWallet(db, wallet);
        // await transfer_receive.execute(db, wallet);
    }
}

export default { updateCoins };