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

async function generateBlock(numBlocks) {
    const generateBlockCommand = `docker exec $(docker ps -qf "name=mercurylayer_bitcoin_1") bitcoin-cli -regtest -rpcuser=user -rpcpassword=pass generatetoaddress ${numBlocks} "bcrt1qgh48u8aj4jvjkalc28lqujyx2wveck4jsm59x9"`;
    exec(generateBlockCommand);
    console.log(`Generated ${numBlocks} blocks`);
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
        await generateBlock(3);
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

    const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_name);

    for (let coin of list_coins) {
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

async function interruptBeforeSignFirst(clientConfig, wallet_1_name, wallet_2_name) {
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

    console.log("Disconnect mercurylayer_mercury_1 from network");
    await exec("docker network disconnect mercurylayer_default mercurylayer_mercury_1");

    try {
        coin = await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin.statechain_id, transfer_address.transfer_receive);
        assert.fail("Expected error when transferring from wallet one again, but no error was thrown");
    } catch (error) {
        console.log("Expected error received: ", error.message);
        assert(error.message.includes("Server public nonce is not available."),   
        `Unexpected error message: ${error.message}`);
    }
    console.log("Connect mercurylayer_mercury_1 from network");
    await exec("docker network connect mercurylayer_default mercurylayer_mercury_1");
}

const new_transaction = async(clientConfig, electrumClient, coin, toAddress, isWithdrawal, qtBackupTx, block_height, network) => {
    let coin_nonce = mercury_wasm.createAndCommitNonces(coin);

    let server_pubnonce = await signFirst(clientConfig, coin_nonce.sign_first_request_payload);

    coin.secret_nonce = coin_nonce.secret_nonce;
    coin.public_nonce = coin_nonce.public_nonce;
    coin.server_public_nonce = server_pubnonce;
    coin.blinding_factor = coin_nonce.blinding_factor;

    const serverInfo = await utils.infoConfig(clientConfig, electrumClient);

    let new_block_height = 0;
    if (block_height == null) {
        const block_header = await electrumClient.request('blockchain.headers.subscribe'); // request(promise)
        new_block_height = block_header.height;
    } else {
        new_block_height = block_height;
    }

    const initlock = serverInfo.initlock;
    const interval = serverInfo.interval;
    const feeRateSatsPerByte = serverInfo.fee_rate_sats_per_byte;

    let partialSigRequest = mercury_wasm.getPartialSigRequest(
        coin,
        new_block_height,
        initlock, 
        interval,
        feeRateSatsPerByte,
        qtBackupTx,
        toAddress,
        network,
        isWithdrawal);

    const serverPartialSigRequest = partialSigRequest.partial_signature_request_payload;

    console.log("Disconnect mercurylayer_mercury_1 from network");
    await exec("docker network disconnect mercurylayer_default mercurylayer_mercury_1");

    let serverPartialSig;

    try {
        serverPartialSig = await signSecond(clientConfig, serverPartialSigRequest);
        assert.fail("Expected error when transferring from wallet one again, but no error was thrown");
    } catch (error) {
        console.log("Expected error received: ", error.message);
        assert(error.message.includes("Server partial signature is not available."),   
        `Unexpected error message: ${error.message}`);
    }

    console.log("Connect mercurylayer_mercury_1 from network");
    await exec("docker network connect mercurylayer_default mercurylayer_mercury_1");
}

async function interruptBeforeSignSecond(clientConfig, wallet_1_name, wallet_2_name) {
    const token = await mercurynodejslib.newToken(clientConfig, wallet_1_name);
    const tokenId = token.token_id;

    const amount = 10000;
    const deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_1_name, amount);

    let tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_1_name);

    let usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);

    await depositCoin(clientConfig, wallet_1_name, amount, deposit_info);

    let coinDeposited = undefined;

    console.log("coin: ", coinDeposited);

    while (!coin) {
        const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_1_name);

        let coinsWithStatechainId = list_coins.filter(c => {
            return c.statechain_id === deposit_info.statechain_id && c.status === CoinStatus.CONFIRMED;
        });

        if (coinsWithStatechainId.length === 0) {
            console.log("Waiting for coin to be confirmed...");
            console.log(`Check the address ${deposit_info.deposit_address} ...\n`);
            await sleep(5000);
            generateBlock(1);
            continue;
        }

        coinDeposited = coinsWithStatechainId[0];
        break;
    }

    console.log("coin: ", coinDeposited);

    let transfer_address = await mercurynodejslib.newTransferAddress(clientConfig, wallet_2_name, null);

    const db = await getDatabase(clientConfig);

    const electrumClient = await getElectrumClient(clientConfig);

    let batchId = (options && options.batchId)  || null;

    let wallet = await sqlite_manager.getWallet(db, walletName);

    const backupTxs = await sqlite_manager.getBackupTxs(db, statechainId);

    if (backupTxs.length === 0) {
        throw new Error(`There is no backup transaction for the statechain id ${statechainId}`);
    }

    const new_tx_n = backupTxs.length + 1;

    let coinsWithStatechainId = wallet.coins.filter(c => {
        return c.statechain_id === statechainId
    });

    if (!coinsWithStatechainId || coinsWithStatechainId.length === 0) {
        throw new Error(`There is no coin for the statechain id ${statechainId}`);
    }

    // If the user sends to himself, he will have two coins with same statechain_id
    // In this case, we need to find the one with the lowest locktime
    // Sort the coins by locktime in ascending order and pick the first one
    let coin = coinsWithStatechainId.sort((a, b) => a.locktime - b.locktime)[0];

    if (coin.status != CoinStatus.CONFIRMED && coin.status != CoinStatus.IN_TRANSFER) {
        throw new Error(`Coin status must be CONFIRMED or IN_TRANSFER to transfer it. The current status is ${coin.status}`);
    }

    if (coin.locktime == null) {
        throw new Error("Coin.locktime is null");
    }

    const blockHeader = await electrumClient.request('blockchain.headers.subscribe'); // request(promise)
    const currentBlockheight = blockHeader.height;

    if (currentBlockheight > coin.locktime)  {
        throw new Error(`The coin is expired. Coin locktime is ${coin.locktime} and current blockheight is ${currentBlockheight}`);
    }

    const statechain_id = coin.statechain_id;
    const signed_statechain_id = coin.signed_statechain_id;

    const isWithdrawal = false;
    const qtBackupTx = backupTxs.length;

    backupTxs.sort((a, b) => a.tx_n - b.tx_n);

    const bkp_tx1 = backupTxs[0];

    const block_height = mercury_wasm.getBlockheight(bkp_tx1);

    const decodedTransferAddress = mercury_wasm.decodeTransferAddress(toAddress);
    const new_auth_pubkey = decodedTransferAddress.auth_pubkey;

    const new_x1 = await get_new_x1(clientConfig, statechain_id, signed_statechain_id, new_auth_pubkey, batchId);

    coin = await new_transaction(clientConfig, electrumClient, coin, transfer_address.transfer_receive, isWithdrawal, qtBackupTx, block_height, wallet.network);
}

async function interruptSignWithElectrumUnavailability(clientConfig, wallet_1_name, wallet_2_name) {
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

    console.log("Disconnect mercurylayer_mercury_1 from network");
    await exec("docker network disconnect mercurylayer_default mercurylayer_electrumx_1");

    try {
        coin = await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin.statechain_id, transfer_address.transfer_receive);
        assert.fail("Expected error when transferring from wallet one again, but no error was thrown");
    } catch (error) {
        console.log("Expected error received: ", error.message);
        assert(error.message.includes("Error getting fee rate from electrum server"),   
        `Unexpected error message: ${error.message}`);
    }
    console.log("Connect mercurylayer_mercury_1 from network");
    await exec("docker network connect mercurylayer_default mercurylayer_electrumx_1");
}

(async () => {

    const clientConfig = client_config.load();

    // let wallet_1_name = "w1";
    // let wallet_2_name = "w2";
    // await createWallet(clientConfig, wallet_1_name);
    // await createWallet(clientConfig, wallet_2_name);
    // await walletTransfersToItselfAndWithdraw(clientConfig, wallet_1_name);
    // await walletTransfersToAnotherAndBroadcastsBackupTx(clientConfig, wallet_1_name, wallet_2_name);


    // // Deposit, repeat send
    // let wallet_3_name = "w3";
    // let wallet_4_name = "w4";
    // await createWallet(clientConfig, wallet_3_name);
    // await createWallet(clientConfig, wallet_4_name);
    // await depositAndRepeatSend(clientConfig, wallet_3_name);
    // await walletTransfersToAnotherAndBroadcastsBackupTx(clientConfig, wallet_3_name, wallet_4_name);
    // console.log("Completed test for Deposit, repeat send");

    // // Transfer-sender after transfer-receiver
    // let wallet_5_name = "w5";
    // let wallet_6_name = "w6";
    // await createWallet(clientConfig, wallet_5_name);
    // await createWallet(clientConfig, wallet_6_name);
    // await transferSenderAfterTransferReceiver(clientConfig, wallet_5_name, wallet_6_name);
    // console.log("Completed test for Transfer-sender after transfer-receiver");

    // // Deposit of 1000 coins in same wallet, and transfer each one 1000 times
    // let wallet_7_name = "w7";
    // await createWallet(clientConfig, wallet_7_name);
    // await depositAndTransfer(clientConfig, wallet_7_name);
    // console.log("Completed test for Deposit of 1000 coins in same wallet, and transfer each one 1000 times");

    // Test for interruption of transferSend before sign first
    let wallet_8_name = "w8";
    let wallet_9_name = "w9";
    await createWallet(clientConfig, wallet_8_name);
    await createWallet(clientConfig, wallet_9_name);
    await interruptBeforeSignFirst(clientConfig, wallet_8_name, wallet_9_name);
    console.log("Completed test for interruption of transferSend before sign first");

    let wallet_10_name = "w10";
    let wallet_11_name = "w11";
    await createWallet(clientConfig, wallet_10_name);
    await createWallet(clientConfig, wallet_11_name);
    await interruptBeforeSignSecond(clientConfig, wallet_10_name, wallet_11_name);
    console.log("Completed test for interruption of transferSend before sign second");

    let wallet_12_name = "w12";
    let wallet_13_name = "w13";
    await createWallet(clientConfig, wallet_12_name);
    await createWallet(clientConfig, wallet_13_name);
    await interruptSignWithElectrumUnavailability(clientConfig, wallet_12_name, wallet_13_name);
    console.log("Completed test for interruption of sign with Electrum unavailability");

    // Deposit, iterative self transfer
    let wallet_14_name = "w14";
    await createWallet(clientConfig, wallet_14_name);
    await walletTransfersToItselfTillLocktimeReachesBlockHeightAndWithdraw(clientConfig, wallet_14_name);
})();
