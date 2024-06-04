const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);
const assert = require('node:assert/strict');
const mercurynodejslib = require('mercurynodejslib');
const { CoinStatus } = require('mercurynodejslib/coin_enum');
const client_config = require('./client_config');

async function removeDatabase() {
    try { 
        const { stdout, stderr } = await exec('rm wallet.db');
        // console.log('stdout:', stdout);
        // console.error('stderr:', stderr);
    } catch (e) {  
        // console.error(e);
    }
}

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function createWallet(clientConfig, walletName) {

    let wallet = await mercurynodejslib.createWallet(clientConfig, walletName);
    assert.equal(wallet.name, walletName);

    // TODO: add more assertions
}

async function walletTransfersToItselfAndWithdraw(clientConfig, wallet_name) {

    const amount = 10000;

    const token = await mercurynodejslib.newToken(clientConfig, wallet_name);
    const tokenId = token.token_id;

    const deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_name, amount);

    let tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_name);

    let usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);

    deposit_info["amount"] = amount;
    console.log("deposit_coin: ", deposit_info);

    const amountInBtc = 0.0001;

    // Sending Bitcoin using bitcoin-cli
    try {
        const sendBitcoinCommand = `docker exec $(docker ps -qf "name=mercurylayer_bitcoin_1") bitcoin-cli -regtest -rpcuser=user -rpcpassword=pass sendtoaddress ${deposit_info.deposit_address} ${amountInBtc}`;
        execSync(sendBitcoinCommand);
        console.log(`Sent ${amountInBtc} BTC to ${deposit_info.deposit_address}`);
    } catch (error) {
        console.error('Error sending Bitcoin:', error.message);
        return;
    }

    let coin = undefined;

    while (!coin) {
        const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_name);

        let coinsWithStatechainId = list_coins.filter(c => {
            return c.statechain_id === deposit_info.statechain_id && c.status === CoinStatus.CONFIRMED;
        });

        if (coinsWithStatechainId.length === 0) {
            console.log("Waiting for coin to be confirmed...");
            console.log(`Check the address ${deposit_info.deposit_address} ...\n`);
            await sleep(5000);
            continue;
        }

        coin = coinsWithStatechainId[0];

        break;
    }

    console.log("coin: ", coin);

    for (let i = 0; i < 10; i++) {
        let transfer_address = await mercurynodejslib.newTransferAddress(clientConfig, wallet_name, null);

        console.log("transfer_address: ", transfer_address);

        coin = await mercurynodejslib.transferSend(clientConfig, wallet_name, coin.statechain_id, transfer_address.transfer_receive);

        console.log("coin transferSend: ", coin);

        let received_statechain_ids = await mercurynodejslib.transferReceive(clientConfig, wallet_name);

        console.log("received_statechain_ids: ", received_statechain_ids);

        assert(received_statechain_ids.length > 0);
        assert(received_statechain_ids[0] == coin.statechain_id);
    }

    let withdraw_address = "tb1qwrujs6f4gyexsextpf9p50smjtht7p7ypknteu";

    let txid = await mercurynodejslib.withdrawCoin(clientConfig, wallet_name, coin.statechain_id, withdraw_address, null);

    console.log("txid: ", txid);

}

async function walletTransfersToItselfTillLocktimeReachesBlockHeightAndWithdraw(clientConfig, wallet_name) {
    const amount = 10000;

    const token = await mercurynodejslib.newToken(clientConfig, wallet_name);
    const tokenId = token.token_id;

    const deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_name, amount);

    let tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_name);

    let usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);

    deposit_info["amount"] = amount;
    console.log("deposit_coin: ", deposit_info);

    let coin = undefined;

    while (!coin) {
        const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_name);

        let coinsWithStatechainId = list_coins.filter(c => {
            return c.statechain_id === deposit_info.statechain_id && c.status === CoinStatus.CONFIRMED;
        });

        if (coinsWithStatechainId.length === 0) {
            console.log("Waiting for coin to be confirmed...");
            console.log(`Check the address ${deposit_info.deposit_address} ...\n`);
            await sleep(5000);
            continue;
        }

        coin = coinsWithStatechainId[0];

        break;
    }

    console.log("coin: ", coin);

    let block_header = client_config.electrum_client.block_headers_subscribe_raw();
    let currentBlockHeight = block_header.height;
    console.log("Current block height: ", currentBlockHeight);

    while (coin.locktime < currentBlockHeight) {
        let transfer_address = await mercurynodejslib.newTransferAddress(clientConfig, wallet_name, null);

        console.log("transfer_address: ", transfer_address);

        coin = await mercurynodejslib.transferSend(clientConfig, wallet_name, coin.statechain_id, transfer_address.transfer_receive);

        console.log("coin transferSend: ", coin);

        let received_statechain_ids = await mercurynodejslib.transferReceive(clientConfig, wallet_name);

        console.log("received_statechain_ids: ", received_statechain_ids);

        assert(received_statechain_ids.length > 0);
        assert(received_statechain_ids[0] == coin.statechain_id);

        // Fetch the coin again to get the updated locktime
        const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_name);
        coin = list_coins.find(c => c.statechain_id === coin.statechain_id);

        console.log("Updated coin: ", coin);
    }

    let withdraw_address = "tb1qwrujs6f4gyexsextpf9p50smjtht7p7ypknteu";

    let txid = await mercurynodejslib.withdrawCoin(clientConfig, wallet_name, coin.statechain_id, withdraw_address, null);

    console.log("txid: ", txid);
}

async function walletTransfersToAnotherAndBroadcastsBackupTx(clientConfig, wallet_1_name, wallet_2_name) {

    const amount = 10000;

    const token = await mercurynodejslib.newToken(clientConfig, wallet_1_name);
    const tokenId = token.token_id;

    const deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_1_name, amount);

    let tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_1_name);

    let usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);

    deposit_info["amount"] = amount;
    console.log("deposit_coin: ", deposit_info);

    let coin = undefined;

    console.log("coin: ", coin);

    while (!coin) {
        const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_1_name);

        let coinsWithStatechainId = list_coins.filter(c => {
            return c.statechain_id === deposit_info.statechain_id && c.status === CoinStatus.CONFIRMED;
        });

        if (coinsWithStatechainId.length === 0) {
            console.log("Waiting for coin to be confirmed...");
            console.log(`Check the address ${deposit_info.deposit_address} ...\n`);
            await sleep(5000);
            continue;
        }

        coin = coinsWithStatechainId[0];

        break;
    }

    console.log("coin: ", coin);

    let transfer_address = await mercurynodejslib.newTransferAddress(clientConfig, wallet_2_name, null);

    coin = await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin.statechain_id, transfer_address.transfer_receive);

    let received_statechain_ids = await mercurynodejslib.transferReceive(clientConfig, wallet_2_name);

    console.log("received_statechain_ids: ", received_statechain_ids);

    assert(received_statechain_ids.length > 0);
    assert(received_statechain_ids[0] == coin.statechain_id);

    let withdraw_address = "tb1qwrujs6f4gyexsextpf9p50smjtht7p7ypknteu";

    let txid = await mercurynodejslib.broadcastBackupTransaction(clientConfig, wallet_2_name, coin.statechain_id, withdraw_address, null);

    console.log("txid: ", txid);
}

async function depositAndRepeatSend(clientConfig, wallet_1_name) {
    const amount = 10000;

    const token = await mercurynodejslib.newToken(clientConfig, wallet_1_name);
    const tokenId = token.token_id;

    const deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_1_name, amount);

    let tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_1_name);
    let usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);

    deposit_info["amount"] = amount;
    console.log("deposit_coin: ", deposit_info);

    let coin = undefined;

    console.log("coin: ", coin);

    while (!coin) {
        const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_1_name);

        let coinsWithStatechainId = list_coins.filter(c => {
            return c.statechain_id === deposit_info.statechain_id && c.status === CoinStatus.CONFIRMED;
        });

        if (coinsWithStatechainId.length === 0) {
            console.log("Waiting for coin to be confirmed...");
            console.log(`Check the address ${deposit_info.deposit_address} ...\n`);
            await sleep(5000);
            continue;
        }

        coin = coinsWithStatechainId[0];
        break;
    }

    console.log("coin: ", coin);

    for (let i = 0; i < 1000; i++) {
        let transfer_address = await mercurynodejslib.newTransferAddress(clientConfig, wallet_1_name, null);
        coin = await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin.statechain_id, transfer_address.transfer_receive);
        let received_statechain_ids = await mercurynodejslib.transferReceive(clientConfig, wallet_1_name);

        assert(received_statechain_ids.length > 0);
        assert(received_statechain_ids[0] == coin.statechain_id);
    }

    let transfer_address = await mercurynodejslib.newTransferAddress(clientConfig, wallet_1_name, null);
    coin = await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin.statechain_id, transfer_address.transfer_receive);

    let received_statechain_ids = await mercurynodejslib.transferReceive(clientConfig, wallet_1_name);

    assert(received_statechain_ids.length > 0);
    assert(received_statechain_ids[0] == coin.statechain_id);
}

(async () => {

    const clientConfig = client_config.load();

    let wallet_1_name = "w1";
    let wallet_2_name = "w2";

    await removeDatabase();
    await createWallet(clientConfig, wallet_1_name);
    await createWallet(clientConfig, wallet_2_name);

    await walletTransfersToItselfAndWithdraw(clientConfig, wallet_1_name);

    await walletTransfersToAnotherAndBroadcastsBackupTx(clientConfig, wallet_1_name, wallet_2_name);

    await removeDatabase();
})();

// Deposit, iterative self transfer
// (async () => {

//     const clientConfig = client_config.load();

//     let wallet_name = "w3";

//     await removeDatabase();
//     await createWallet(clientConfig, wallet_name);

//     await walletTransfersToItselfTillLocktimeReachesBlockHeightAndWithdraw(clientConfig, wallet_name);

//     await removeDatabase();
// })();

// Deposit, repeat send
// (async () => {
//     const clientConfig = client_config.load();

//     let wallet_1_name = "w1";
//     let wallet_2_name = "w2";

//     await removeDatabase();
//     await createWallet(clientConfig, wallet_1_name);
//     await createWallet(clientConfig, wallet_2_name);

//     await depositAndRepeatSend(clientConfig, wallet_1_name);

//     await walletTransfersToAnotherAndBroadcastsBackupTx(clientConfig, wallet_1_name, wallet_2_name);

//     await removeDatabase();
// })();
