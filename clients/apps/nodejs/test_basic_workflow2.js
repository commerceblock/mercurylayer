const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);
const assert = require('node:assert/strict');
const mercurynodejslib = require('mercurynodejslib');
const { CoinStatus } = require('mercurynodejslib/coin_enum');
const client_config = require('./client_config');

async function removeDatabase() {
    try {
        const clientConfig = client_config.load(); 
        const { stdout, stderr } = await exec(`rm ./${clientConfig.databaseFile}`);
        console.log('stdout:', stdout);
        console.error('stderr:', stderr);
    } catch (e) {  
        console.error(e);
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

async function depositCoin(clientConfig, wallet_name, amount, deposit_info) {

    deposit_info["amount"] = amount;
    console.log("deposit_coin: ", deposit_info);

    const amountInBtc = amount / 100000000;

    // Sending Bitcoin using bitcoin-cli
    try {
        const sendBitcoinCommand = `docker exec $(docker ps -qf "name=mercurylayer_bitcoin_1") bitcoin-cli -regtest -rpcuser=user -rpcpassword=pass sendtoaddress ${deposit_info.deposit_address} ${amountInBtc}`;
        exec(sendBitcoinCommand);
        console.log(`Sent ${amountInBtc} BTC to ${deposit_info.deposit_address}`);
        const generateBlockCommand = `docker exec $(docker ps -qf "name=mercurylayer_bitcoin_1") bitcoin-cli -regtest -rpcuser=user -rpcpassword=pass generatetoaddress ${clientConfig.confirmationTarget + 1} "bcrt1qgh48u8aj4jvjkalc28lqujyx2wveck4jsm59x9"`;
        exec(generateBlockCommand);
        console.log(`Generated ${clientConfig.confirmationTarget + 1} blocks`);
    } catch (error) {
        console.error('Error sending Bitcoin:', error.message);
        return;
    }
}

async function walletTransfersToItselfAndWithdraw(clientConfig, wallet_name) {

    const token = await mercurynodejslib.newToken(clientConfig, wallet_name);
    const tokenId = token.token_id;

    const amount = 10000;
    const deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_name, amount);

    let tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_name);

    let usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);

    await depositCoin(clientConfig, wallet_name, amount, deposit_info);

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

    let withdraw_address = "bcrt1qgh48u8aj4jvjkalc28lqujyx2wveck4jsm59x9";

    let txid = await mercurynodejslib.withdrawCoin(clientConfig, wallet_name, coin.statechain_id, withdraw_address, null);

    console.log("txid: ", txid);

}

async function walletTransfersToItselfTillLocktimeReachesBlockHeightAndWithdraw(clientConfig, wallet_name) {

    const token = await mercurynodejslib.newToken(clientConfig, wallet_name);
    const tokenId = token.token_id;

    const amount = 10000;
    const deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_name, amount);

    let tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_name);

    let usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);
    
    await depositCoin(clientConfig, wallet_name, amount, deposit_info);

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

    const electrumClient = await mercurynodejslib.getElectrumClient(clientConfig);

    let block_header = await electrumClient.request('blockchain.headers.subscribe');
    let currentBlockHeight = block_header.height;
    console.log("Current block height: ", currentBlockHeight);

    while (coin.locktime <= currentBlockHeight) {
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

    let withdraw_address = "bcrt1qgh48u8aj4jvjkalc28lqujyx2wveck4jsm59x9";

    let txid = await mercurynodejslib.withdrawCoin(clientConfig, wallet_name, coin.statechain_id, withdraw_address, null);

    console.log("txid: ", txid);
}

async function walletTransfersToAnotherAndBroadcastsBackupTx(clientConfig, wallet_1_name, wallet_2_name) {

    const token = await mercurynodejslib.newToken(clientConfig, wallet_1_name);
    const tokenId = token.token_id;

    const amount = 10000;
    const deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_1_name, amount);

    let tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_1_name);

    let usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);

    await depositCoin(clientConfig, wallet_1_name, amount, deposit_info);

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

    let withdraw_address = "bcrt1qgh48u8aj4jvjkalc28lqujyx2wveck4jsm59x9";

    let txid = await mercurynodejslib.broadcastBackupTransaction(clientConfig, wallet_2_name, coin.statechain_id, withdraw_address, null);

    console.log("txid: ", txid);
}

async function depositAndRepeatSend(clientConfig, wallet_1_name) {

    const token = await mercurynodejslib.newToken(clientConfig, wallet_1_name);
    const tokenId = token.token_id;

    const amount = 10000;
    const deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_1_name, amount);

    let tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_1_name);

    let usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);
    
    await depositCoin(clientConfig, wallet_1_name, amount, deposit_info);

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

    for (let i = 0; i < 10; i++) {
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

async function transferSenderAfterTransferReceiver(clientConfig, wallet_1_name, wallet_2_name) {

    const token = await mercurynodejslib.newToken(clientConfig, wallet_1_name);
    const tokenId = token.token_id;

    const amount = 10000;
    const deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_1_name, amount);

    let tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_1_name);

    let usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);
    
    await depositCoin(clientConfig, wallet_1_name, amount, deposit_info);

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

    try {
        transfer_address = await mercurynodejslib.newTransferAddress(clientConfig, wallet_2_name, null);
        await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin.statechain_id, transfer_address.transfer_receive);
        assert.fail("Expected error when transferring from wallet one again, but no error was thrown");
    } catch (error) {
        console.log("Expected error received: ", error.message);
        assert(error.message.includes("Coin status must be CONFIRMED or IN_TRANSFER to transfer it. The current status is TRANSFERRED"),
        `Unexpected error message: ${error.message}`);
    }
}

async function depositAndTransfer(clientConfig, wallet_name) {

    const token = await mercurynodejslib.newToken(clientConfig, wallet_name);
    const tokenId = token.token_id;

    const amount = 10000;
    const deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_name, amount);

    let tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_name);

    let usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);
    
    for (let i = 0; i < 10; i++) {
        await depositCoin(clientConfig, wallet_name, amount, deposit_info);

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
    }

    const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_1_name);

    for (const coin of list_coins) {
        let transfer_address = await mercurynodejslib.newTransferAddress(clientConfig, wallet_name, null);

        console.log("transfer_address: ", transfer_address);

        coin = await mercurynodejslib.transferSend(clientConfig, wallet_name, coin.statechain_id, transfer_address.transfer_receive);

        console.log("coin transferSend: ", coin);

        let received_statechain_ids = await mercurynodejslib.transferReceive(clientConfig, wallet_name);

        console.log("received_statechain_ids: ", received_statechain_ids);

        assert(received_statechain_ids.length > 0);
        assert(received_statechain_ids[0] == coin.statechain_id);
    }
}

(async () => {

    const clientConfig = client_config.load();

    let wallet_1_name = "w1";
    let wallet_2_name = "w2";
    await createWallet(clientConfig, wallet_1_name);
    await createWallet(clientConfig, wallet_2_name);
    await walletTransfersToItselfAndWithdraw(clientConfig, wallet_1_name);
    await walletTransfersToAnotherAndBroadcastsBackupTx(clientConfig, wallet_1_name, wallet_2_name);


    // Deposit, repeat send
    let wallet_3_name = "w3";
    let wallet_4_name = "w4";
    await createWallet(clientConfig, wallet_3_name);
    await createWallet(clientConfig, wallet_4_name);
    await depositAndRepeatSend(clientConfig, wallet_3_name);
    await walletTransfersToAnotherAndBroadcastsBackupTx(clientConfig, wallet_3_name, wallet_4_name);

    // Transfer-sender after transfer-receiver
    let wallet_5_name = "w5";
    let wallet_6_name = "w6";
    await createWallet(clientConfig, wallet_5_name);
    await createWallet(clientConfig, wallet_6_name);
    await transferSenderAfterTransferReceiver(clientConfig, wallet_5_name, wallet_6_name);

    // Deposit of 1000 coins in same wallet, and transfer each one 1000 times
    let wallet_7_name = "w7";
    await createWallet(clientConfig, wallet_7_name);
    await depositAndTransfer(clientConfig, wallet_7_name);

    // Deposit, iterative self transfer
    let wallet_8_name = "w8";
    await createWallet(clientConfig, wallet_8_name);
    await walletTransfersToItselfTillLocktimeReachesBlockHeightAndWithdraw(clientConfig, wallet_8_name);
})();
