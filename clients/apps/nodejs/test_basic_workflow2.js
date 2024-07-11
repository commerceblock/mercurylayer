const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);
const assert = require('node:assert/strict');
const mercurynodejslib = require('mercurynodejslib');
const { CoinStatus } = require('mercurynodejslib/coin_enum');
const client_config = require('./client_config');
const ElectrumCli = require('@mempool/electrum-client');
const sqlite3 = require('sqlite3').verbose();
const sqlite_manager = require('../../libs/nodejs/sqlite_manager');
const mercury_wasm = require('mercury-wasm');
const transaction = require('../../libs/nodejs/transaction');
const utils = require('../../libs/nodejs/utils');

async function removeDatabase() {
    try {
        const clientConfig = client_config.load(); 
        const { stdout, stderr } = await exec(`rm ${clientConfig.databaseFile}`);
        // console.log('stdout:', stdout);
        // console.error('stderr:', stderr);
    } catch (e) {  
        console.error(e);
    }
}

const getDatabase = async (clientConfig) => {
    const databaseFile = clientConfig.databaseFile;
    const db = new sqlite3.Database(databaseFile);
    await sqlite_manager.createTables(db);
    return db;
}

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function createWallet(clientConfig, walletName) {

    let wallet = await mercurynodejslib.createWallet(clientConfig, walletName);
    assert.equal(wallet.name, walletName);

    // TODO: add more assertions
}

const getElectrumClient = async (clientConfig) => {

    const urlElectrum = clientConfig.electrumServer;
    const urlElectrumObject = new URL(urlElectrum);

    const electrumPort = parseInt(urlElectrumObject.port, 10);
    const electrumHostname = urlElectrumObject.hostname;  
    const electrumProtocol = urlElectrumObject.protocol.slice(0, -1);

    const electrumClient = new ElectrumCli(electrumPort, electrumHostname, electrumProtocol);
    await electrumClient.connect();

    return electrumClient;
}

async function generateBlock(numBlocks) {
    const generateBlockCommand = `docker exec $(docker ps -qf "name=mercurylayer_bitcoind_1") bitcoin-cli -regtest -rpcuser=user -rpcpassword=pass generatetoaddress ${numBlocks} "bcrt1qgh48u8aj4jvjkalc28lqujyx2wveck4jsm59x9"`;
    await exec(generateBlockCommand);
    // console.log(`Generated ${numBlocks} blocks`);

    const clientConfig = client_config.load();
    const electrumClient = await getElectrumClient(clientConfig);
    const block_header = await electrumClient.request('blockchain.headers.subscribe');
    const blockheight = block_header.height;
    // console.log("Current block height: ", blockheight);
}

async function depositCoin(clientConfig, wallet_name, amount, deposit_info) {

    deposit_info["amount"] = amount;
    // console.log("deposit_coin: ", deposit_info);

    const amountInBtc = amount / 100000000;

    // Sending Bitcoin using bitcoin-cli
    try {
        const sendBitcoinCommand = `docker exec $(docker ps -qf "name=mercurylayer_bitcoind_1") bitcoin-cli -regtest -rpcuser=user -rpcpassword=pass sendtoaddress ${deposit_info.deposit_address} ${amountInBtc}`;
        exec(sendBitcoinCommand);
        // console.log(`Sent ${amountInBtc} BTC to ${deposit_info.deposit_address}`);
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
        // console.log(list_coins);

        let coinsWithStatechainId = list_coins.filter(c => {
            return c.statechain_id === deposit_info.statechain_id && c.status === CoinStatus.CONFIRMED;
        });

        if (coinsWithStatechainId.length === 0) {
            // console.log("Waiting for coin to be confirmed...");
            // console.log(`Check the address ${deposit_info.deposit_address} ...\n`);
            await sleep(1000);
            generateBlock(1);
            continue;
        }

        coin = coinsWithStatechainId[0];

        break;
    }

    for (let i = 0; i < 10; i++) {
        let transfer_address = await mercurynodejslib.newTransferAddress(clientConfig, wallet_name, null);

        coin = await mercurynodejslib.transferSend(clientConfig, wallet_name, coin.statechain_id, transfer_address.transfer_receive);

        let transferReceiveResult = await mercurynodejslib.transferReceive(clientConfig, wallet_name);
        let received_statechain_ids = transferReceiveResult.receivedStatechainIds;

        assert(received_statechain_ids.length > 0);
        assert(received_statechain_ids[0] == coin.statechain_id);
    }

    let withdraw_address = "bcrt1qgh48u8aj4jvjkalc28lqujyx2wveck4jsm59x9";

    let txid = await mercurynodejslib.withdrawCoin(clientConfig, wallet_name, coin.statechain_id, withdraw_address, null);

    // TODO: confirm withdrawal status
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
            /* console.log("Waiting for coin to be confirmed...");
            console.log(`Check the address ${deposit_info.deposit_address} ...\n`); */
            await sleep(5000);
            generateBlock(1);
            continue;
        }

        coin = coinsWithStatechainId[0];

        break;
    }

    const electrumClient = await getElectrumClient(clientConfig);

    let block_header = await electrumClient.request('blockchain.headers.subscribe');
    let currentBlockHeight = block_header.height;

    while (coin.locktime <= currentBlockHeight) {
        let transfer_address = await mercurynodejslib.newTransferAddress(clientConfig, wallet_name, null);

        coin = await mercurynodejslib.transferSend(clientConfig, wallet_name, coin.statechain_id, transfer_address.transfer_receive);

        let transferReceiveResult = await mercurynodejslib.transferReceive(clientConfig, wallet_name);
        let received_statechain_ids = transferReceiveResult.receivedStatechainIds;

        assert(received_statechain_ids.length > 0);
        assert(received_statechain_ids[0] == coin.statechain_id);

        // Fetch the coin again to get the updated locktime
        const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_name);
        coin = list_coins.find(c => c.statechain_id === coin.statechain_id);
    }

    let withdraw_address = "bcrt1qgh48u8aj4jvjkalc28lqujyx2wveck4jsm59x9";

    let txid = await mercurynodejslib.withdrawCoin(clientConfig, wallet_name, coin.statechain_id, withdraw_address, null);

    // TODO: confirm withdrawal status
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

    while (!coin) {
        const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_1_name);

        let coinsWithStatechainId = list_coins.filter(c => {
            return c.statechain_id === deposit_info.statechain_id && c.status === CoinStatus.CONFIRMED;
        });

        if (coinsWithStatechainId.length === 0) {
            /* console.log("Waiting for coin to be confirmed...");
            console.log(`Check the address ${deposit_info.deposit_address} ...\n`); */
            await sleep(1000);
            generateBlock(1);
            continue;
        }

        coin = coinsWithStatechainId[0];

        break;
    }

    let transfer_address = await mercurynodejslib.newTransferAddress(clientConfig, wallet_2_name, null);

    coin = await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin.statechain_id, transfer_address.transfer_receive);

    let transferReceiveResult = await mercurynodejslib.transferReceive(clientConfig, wallet_2_name);
    let received_statechain_ids = transferReceiveResult.receivedStatechainIds;

    assert(received_statechain_ids.length > 0);
    assert(received_statechain_ids[0] == coin.statechain_id);

    let withdraw_address = "bcrt1qgh48u8aj4jvjkalc28lqujyx2wveck4jsm59x9";

    let txid = await mercurynodejslib.broadcastBackupTransaction(clientConfig, wallet_2_name, coin.statechain_id, withdraw_address, null);

    // TODO: confirm withdrawal status
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

    while (!coin) {
        const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_1_name);

        let coinsWithStatechainId = list_coins.filter(c => {
            return c.statechain_id === deposit_info.statechain_id && c.status === CoinStatus.CONFIRMED;
        });

        if (coinsWithStatechainId.length === 0) {
            // console.log("Waiting for coin to be confirmed...");
            // console.log(`Check the address ${deposit_info.deposit_address} ...\n`);
            await sleep(1000);
            generateBlock(1);
            continue;
        }

        coin = coinsWithStatechainId[0];
        break;
    }

    for (let i = 0; i < 10; i++) {
        let transfer_address = await mercurynodejslib.newTransferAddress(clientConfig, wallet_1_name, null);
        coin = await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin.statechain_id, transfer_address.transfer_receive);
        let transferReceiveResult = await mercurynodejslib.transferReceive(clientConfig, wallet_1_name);
        let received_statechain_ids = transferReceiveResult.receivedStatechainIds;

        assert(received_statechain_ids.length > 0);
        assert(received_statechain_ids[0] == coin.statechain_id);
    }

    let transfer_address = await mercurynodejslib.newTransferAddress(clientConfig, wallet_1_name, null);
    coin = await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin.statechain_id, transfer_address.transfer_receive);

    let transferReceiveResult = await mercurynodejslib.transferReceive(clientConfig, wallet_1_name);
    let received_statechain_ids = transferReceiveResult.receivedStatechainIds;

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

    while (!coin) {
        const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_1_name);

        let coinsWithStatechainId = list_coins.filter(c => {
            return c.statechain_id === deposit_info.statechain_id && c.status === CoinStatus.CONFIRMED;
        });

        if (coinsWithStatechainId.length === 0) {
            // console.log("Waiting for coin to be confirmed...");
            // console.log(`Check the address ${deposit_info.deposit_address} ...\n`);
            await sleep(1000);
            generateBlock(1);
            continue;
        }

        coin = coinsWithStatechainId[0];
        break;
    }

    let transfer_address = await mercurynodejslib.newTransferAddress(clientConfig, wallet_2_name, null);

    coin = await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin.statechain_id, transfer_address.transfer_receive);

    let transferReceiveResult = await mercurynodejslib.transferReceive(clientConfig, wallet_2_name);
    let received_statechain_ids = transferReceiveResult.receivedStatechainIds;

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
                // console.log("Waiting for coin to be confirmed...");
                // console.log(`Check the address ${deposit_info.deposit_address} ...\n`);
                await sleep(1000);
                generateBlock(1);
                continue;
            }

            coin = coinsWithStatechainId[0];

            break;
        }
    }

    const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_name);

    for (let coin of list_coins) {
        let transfer_address = await mercurynodejslib.newTransferAddress(clientConfig, wallet_name, null);

        coin = await mercurynodejslib.transferSend(clientConfig, wallet_name, coin.statechain_id, transfer_address.transfer_receive);

        let transferReceiveResult = await mercurynodejslib.transferReceive(clientConfig, wallet_name);
        let received_statechain_ids = transferReceiveResult.receivedStatechainIds;

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

    while (!coin) {
        const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_1_name);

        let coinsWithStatechainId = list_coins.filter(c => {
            return c.statechain_id === deposit_info.statechain_id && c.status === CoinStatus.CONFIRMED;
        });

        if (coinsWithStatechainId.length === 0) {
            // console.log("Waiting for coin to be confirmed...");
            // console.log(`Check the address ${deposit_info.deposit_address} ...\n`);
            await sleep(1000);
            generateBlock(1);
            continue;
        }

        coin = coinsWithStatechainId[0];
        break;
    }

    let transfer_address = await mercurynodejslib.newTransferAddress(clientConfig, wallet_2_name, null);

    console.log("Disconnect mercurylayer_mercury_1 from network");
    await exec("docker network disconnect mercurylayer_default mercurylayer_mercury_1");

    try {
        coin = await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin.statechain_id, transfer_address.transfer_receive);
        assert.fail("Expected error when transferring from wallet one, but no error was thrown");
    } catch (error) {
        console.log("Expected error received: ", error.message);
        assert(error.message.includes("connect ECONNREFUSED 0.0.0.0:8000"),   
        `Unexpected error message: ${error.message}`);
    }
    console.log("Connect mercurylayer_mercury_1 from network");
    await exec("docker network connect mercurylayer_default mercurylayer_mercury_1");
}

const new_transaction = async(clientConfig, electrumClient, coin, toAddress, isWithdrawal, qtBackupTx, block_height, network) => {
    let coin_nonce = mercury_wasm.createAndCommitNonces(coin);

    let server_pubnonce = await transaction.signFirst(clientConfig, coin_nonce.sign_first_request_payload);

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
        serverPartialSig = await transaction.signSecond(clientConfig, serverPartialSigRequest);
        assert.fail("Expected error when signing second transaction, but no error was thrown");
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

    while (!coinDeposited) {
        const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_1_name);

        let coinsWithStatechainId = list_coins.filter(c => {
            return c.statechain_id === deposit_info.statechain_id && c.status === CoinStatus.CONFIRMED;
        });

        if (coinsWithStatechainId.length === 0) {
            // console.log("Waiting for coin to be confirmed...");
            // console.log(`Check the address ${deposit_info.deposit_address} ...\n`);
            await sleep(1000);
            generateBlock(1);
            continue;
        }

        coinDeposited = coinsWithStatechainId[0];
        break;
    }

    let transfer_address = await mercurynodejslib.newTransferAddress(clientConfig, wallet_2_name, null);

    const db = await getDatabase(clientConfig);

    const electrumClient = await getElectrumClient(clientConfig);

    let options = transfer_address.transfer_receive;

    let batchId = (options && options.batchId)  || null;

    let wallet = await sqlite_manager.getWallet(db, wallet_1_name);

    const backupTxs = await sqlite_manager.getBackupTxs(db, coinDeposited.statechain_id);

    if (backupTxs.length === 0) {
        throw new Error(`There is no backup transaction for the statechain id ${coinDeposited.statechain_id}`);
    }

    const new_tx_n = backupTxs.length + 1;

    let coinsWithStatechainId = wallet.coins.filter(c => {
        return c.statechain_id === coinDeposited.statechain_id
    });

    if (!coinsWithStatechainId || coinsWithStatechainId.length === 0) {
        throw new Error(`There is no coin for the statechain id ${coinDeposited.statechain_id}`);
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

    const decodedTransferAddress = mercury_wasm.decodeTransferAddress(transfer_address.transfer_receive);
    const new_auth_pubkey = decodedTransferAddress.auth_pubkey;

    // const new_x1 = await get_new_x1(clientConfig, statechain_id, signed_statechain_id, new_auth_pubkey, batchId);

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

    while (!coin) {
        const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_1_name);

        let coinsWithStatechainId = list_coins.filter(c => {
            return c.statechain_id === deposit_info.statechain_id && c.status === CoinStatus.CONFIRMED;
        });

        if (coinsWithStatechainId.length === 0) {
            // console.log("Waiting for coin to be confirmed...");
            // console.log(`Check the address ${deposit_info.deposit_address} ...\n`);
            await sleep(1000);
            generateBlock(1);
            continue;
        }

        coin = coinsWithStatechainId[0];
        break;
    }

    let transfer_address = await mercurynodejslib.newTransferAddress(clientConfig, wallet_2_name, null);

    await sleep(5000); // wait for Electrum to disconnect

    console.log("Disconnect mercurylayer_electrs_1 from network");
    await exec("docker network disconnect mercurylayer_default mercurylayer_electrs_1");

    try {
        coin = await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin.statechain_id, transfer_address.transfer_receive);
        assert.fail("Expected error when transferring from wallet one, but no error was thrown");
    } catch (error) {
        console.log("Expected error received: ", error.message);
        assert(error.message.includes("connect ECONNREFUSED 0.0.0.0:50001"),   
        `Unexpected error message: ${error.message}`);
    }
    console.log("Connect mercurylayer_electrs_1 from network");
    await exec("docker network connect mercurylayer_default mercurylayer_electrs_1");

    await sleep(5000); // wait for Electrum to connect
}

async function interruptTransferReceiveWithElectrumUnavailability(clientConfig, wallet_1_name, wallet_2_name) {

    const token = await mercurynodejslib.newToken(clientConfig, wallet_1_name);
    const tokenId = token.token_id;

    const amount = 10000;
    const deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_1_name, amount);

    let tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_1_name);

    let usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);
    
    await depositCoin(clientConfig, wallet_1_name, amount, deposit_info);

    let coin = undefined;

    while (!coin) {
        const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_1_name);

        let coinsWithStatechainId = list_coins.filter(c => {
            return c.statechain_id === deposit_info.statechain_id && c.status === CoinStatus.CONFIRMED;
        });

        if (coinsWithStatechainId.length === 0) {
            /* console.log("Waiting for coin to be confirmed...");
            console.log(`Check the address ${deposit_info.deposit_address} ...\n`); */
            await sleep(1000);
            generateBlock(1);
            continue;
        }

        coin = coinsWithStatechainId[0];
        break;
    }

    let transfer_address = await mercurynodejslib.newTransferAddress(clientConfig, wallet_2_name, null);

    coin = await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin.statechain_id, transfer_address.transfer_receive);

    await sleep(5000); // wait for Electrum to disconnect

    console.log("Disconnect mercurylayer_electrs_1 from network");
    await exec("docker network disconnect mercurylayer_default mercurylayer_electrs_1");

    try {
        await mercurynodejslib.transferReceive(clientConfig, wallet_2_name);
        assert.fail("Expected error when receiving into wallet two, but no error was thrown");
    } catch (error) {
        console.log("Expected error received: ", error.message);
        assert(error.message.includes("connect ECONNREFUSED 0.0.0.0:50001"),   
        `Unexpected error message: ${error.message}`);
    }
    console.log("Connect mercurylayer_electrs_1 from network");
    await exec("docker network connect mercurylayer_default mercurylayer_electrs_1");

    await sleep(5000); // wait for Electrum to connect
}

async function interruptTransferReceiveWithMercuryServerUnavailability(clientConfig, wallet_1_name, wallet_2_name) {

    const token = await mercurynodejslib.newToken(clientConfig, wallet_1_name);
    const tokenId = token.token_id;

    const amount = 10000;
    const deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_1_name, amount);

    let tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_1_name);

    let usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);
    
    await depositCoin(clientConfig, wallet_1_name, amount, deposit_info);

    let coin = undefined;

    while (!coin) {
        const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_1_name);

        let coinsWithStatechainId = list_coins.filter(c => {
            return c.statechain_id === deposit_info.statechain_id && c.status === CoinStatus.CONFIRMED;
        });

        if (coinsWithStatechainId.length === 0) {
            /* console.log("Waiting for coin to be confirmed...");
            console.log(`Check the address ${deposit_info.deposit_address} ...\n`); */
            await sleep(5000);
            generateBlock(1);
            continue;
        }

        coin = coinsWithStatechainId[0];
        break;
    }

    let transfer_address = await mercurynodejslib.newTransferAddress(clientConfig, wallet_2_name, null);

    coin = await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin.statechain_id, transfer_address.transfer_receive);

    console.log("Disconnect mercurylayer_mercury_1 from network");
    await exec("docker network disconnect mercurylayer_default mercurylayer_mercury_1");

    try {
        let received_statechain_ids = await mercurynodejslib.transferReceive(clientConfig, wallet_2_name);
        assert.fail("Expected error when receiving into wallet two, but no error was thrown");
    } catch (error) {
        console.log("Expected error received: ", error.message);
        assert(error.message.includes("connect ECONNREFUSED 0.0.0.0:8000"),   
        `Unexpected error message: ${error.message}`);
    }
    console.log("Connect mercurylayer_mercury_1 from network");
    await exec("docker network connect mercurylayer_default mercurylayer_mercury_1");
}

async function transferSendAtCoinExpiry(clientConfig, wallet_1_name, wallet_2_name) {

    const token = await mercurynodejslib.newToken(clientConfig, wallet_1_name);
    const tokenId = token.token_id;

    const amount = 10000;
    const deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_1_name, amount);

    let tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_1_name);

    let usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);
    
    await depositCoin(clientConfig, wallet_1_name, amount, deposit_info);

    let coin = undefined;

    while (!coin) {
        const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_1_name);

        let coinsWithStatechainId = list_coins.filter(c => {
            return c.statechain_id === deposit_info.statechain_id && c.status === CoinStatus.CONFIRMED;
        });

        if (coinsWithStatechainId.length === 0) {
            /* console.log("Waiting for coin to be confirmed...");
            console.log(`Check the address ${deposit_info.deposit_address} ...\n`); */
            await sleep(1000);
            generateBlock(1);
            continue;
        }

        coin = coinsWithStatechainId[0];
        break;
    }

    const electrumClient = await getElectrumClient(clientConfig);

    const blockHeader = await electrumClient.request('blockchain.headers.subscribe'); // request(promise)
    const currentBlockheight = blockHeader.height;

    const blocksToBeGenerated = coin.locktime - currentBlockheight;
    await generateBlock(blocksToBeGenerated);

    let transfer_address = await mercurynodejslib.newTransferAddress(clientConfig, wallet_2_name, null);

    try {
        coin = await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin.statechain_id, transfer_address.transfer_receive);
        assert.fail("Expected error when transferring expired coin, but no error was thrown");
    } catch (error) {
        console.log("Expected error received: ", error.message);
        assert(error.message.includes("The coin is expired."),   
        `Unexpected error message: ${error.message}`);
    }
}

async function transferReceiveAtCoinExpiry(clientConfig, wallet_1_name, wallet_2_name) {

    const token = await mercurynodejslib.newToken(clientConfig, wallet_1_name);
    const tokenId = token.token_id;

    const amount = 10000;
    const deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_1_name, amount);

    let tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_1_name);

    let usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);
    
    await depositCoin(clientConfig, wallet_1_name, amount, deposit_info);

    let coin = undefined;

    while (!coin) {
        const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_1_name);

        let coinsWithStatechainId = list_coins.filter(c => {
            return c.statechain_id === deposit_info.statechain_id && c.status === CoinStatus.CONFIRMED;
        });

        if (coinsWithStatechainId.length === 0) {
            /* console.log("Waiting for coin to be confirmed...");
            console.log(`Check the address ${deposit_info.deposit_address} ...\n`); */
            await sleep(5000);
            generateBlock(1);
            continue;
        }

        coin = coinsWithStatechainId[0];
        break;
    }

    let transfer_address = await mercurynodejslib.newTransferAddress(clientConfig, wallet_2_name, null);

    coin = await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin.statechain_id, transfer_address.transfer_receive);

    const electrumClient = await getElectrumClient(clientConfig);

    const blockHeader = await electrumClient.request('blockchain.headers.subscribe'); // request(promise)
    const currentBlockheight = blockHeader.height;

    const blocksToBeGenerated = coin.locktime - currentBlockheight;
    await generateBlock(blocksToBeGenerated);

    let errorMessage;
    console.error = (msg) => {
        errorMessage = msg;
    };

    let transferReceiveResult = await mercurynodejslib.transferReceive(clientConfig, wallet_2_name);
    let received_statechain_ids = transferReceiveResult.receivedStatechainIds;

    // Assert the captured error message
    const expectedMessage = 'The coin is expired.';
    assert.ok(errorMessage.includes(expectedMessage));

    assert(received_statechain_ids.length > 0);
    assert(received_statechain_ids[0] == coin.statechain_id);
}

async function transferSendCoinExpiryBySending(clientConfig, wallet_1_name, wallet_2_name) {

    const token = await mercurynodejslib.newToken(clientConfig, wallet_1_name);
    const tokenId = token.token_id;

    const amount = 10000;
    const deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_1_name, amount);

    let tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_1_name);

    let usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);
    
    await depositCoin(clientConfig, wallet_1_name, amount, deposit_info);

    let coin = undefined;

    while (!coin) {
        const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_1_name);

        let coinsWithStatechainId = list_coins.filter(c => {
            return c.statechain_id === deposit_info.statechain_id && c.status === CoinStatus.CONFIRMED;
        });

        if (coinsWithStatechainId.length === 0) {
            /* console.log("Waiting for coin to be confirmed...");
            console.log(`Check the address ${deposit_info.deposit_address} ...\n`); */
            await sleep(5000);
            generateBlock(1);
            continue;
        }

        coin = coinsWithStatechainId[0];
        break;
    }

    const electrumClient = await getElectrumClient(clientConfig);

    const blockHeader = await electrumClient.request('blockchain.headers.subscribe'); // request(promise)
    const currentBlockheight = blockHeader.height;

    const serverInfo = await utils.infoConfig(clientConfig, electrumClient);

    const blocksToBeGenerated = coin.locktime - currentBlockheight - serverInfo.interval;
    await generateBlock(blocksToBeGenerated);

    let transfer_address = await mercurynodejslib.newTransferAddress(clientConfig, wallet_2_name, null);

    try {
        coin = await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin.statechain_id, transfer_address.transfer_receive);
        assert.fail("Expected error when transferring expired coin, but no error was thrown");
    } catch (error) {
        console.log("Expected error received: ", error.message);
        assert(error.message.includes("The coin is expired."),   
        `Unexpected error message: ${error.message}`);
    }
}

(async () => {

    removeDatabase();

    try {
        const clientConfig = client_config.load();

        let wallet_1_name = "w1";
        let wallet_2_name = "w2";
        await createWallet(clientConfig, wallet_1_name);
        await createWallet(clientConfig, wallet_2_name);
        await walletTransfersToItselfAndWithdraw(clientConfig, wallet_1_name);
        console.log("walletTransfersToItselfAndWithdraw test completed successfully.");
        // await walletTransfersToAnotherAndBroadcastsBackupTx(clientConfig, wallet_1_name, wallet_2_name);


        // Deposit, repeat send
        let wallet_3_name = "w3";
        let wallet_4_name = "w4";
        await createWallet(clientConfig, wallet_3_name);
        await createWallet(clientConfig, wallet_4_name);
        await depositAndRepeatSend(clientConfig, wallet_3_name);
        console.log("Completed test for Deposit, repeat send");

        // Transfer-sender after transfer-receiver
        let wallet_5_name = "w5";
        let wallet_6_name = "w6";
        await createWallet(clientConfig, wallet_5_name);
        await createWallet(clientConfig, wallet_6_name);
        await transferSenderAfterTransferReceiver(clientConfig, wallet_5_name, wallet_6_name);
        console.log("Completed test for Transfer-sender after transfer-receiver");

        // Deposit of 10 coins in same wallet, and transfer each one 10 times
        let wallet_7_name = "w7";
        await createWallet(clientConfig, wallet_7_name);
        await depositAndTransfer(clientConfig, wallet_7_name);
        console.log("Completed test for Deposit of 100 coins in same wallet, and transfer each one 100 times");

        // Test for interruption of transferSend before sign first
        let wallet_8_name = "w8";
        let wallet_9_name = "w9";
        await createWallet(clientConfig, wallet_8_name);
        await createWallet(clientConfig, wallet_9_name);
        await interruptBeforeSignFirst(clientConfig, wallet_8_name, wallet_9_name);
        console.log("Completed test for interruption of transferSend before sign first");

        // Test for interruption of transferSend before sign second
        let wallet_10_name = "w10";
        let wallet_11_name = "w11";
        await createWallet(clientConfig, wallet_10_name);
        await createWallet(clientConfig, wallet_11_name);
        await interruptBeforeSignSecond(clientConfig, wallet_10_name, wallet_11_name);
        console.log("Completed test for interruption of transferSend before sign second");

        // Test for interruption of sign with Electrum unavailability
        let wallet_12_name = "w12";
        let wallet_13_name = "w13";
        await createWallet(clientConfig, wallet_12_name);
        await createWallet(clientConfig, wallet_13_name);
        await interruptSignWithElectrumUnavailability(clientConfig, wallet_12_name, wallet_13_name);
        console.log("Completed test for interruption of sign with Electrum unavailability");

        // Test for interruption of transfer receive with Electrum unavailability
        let wallet_14_name = "w14";
        let wallet_15_name = "w15";
        await createWallet(clientConfig, wallet_14_name);
        await createWallet(clientConfig, wallet_15_name);
        await interruptTransferReceiveWithElectrumUnavailability(clientConfig, wallet_14_name, wallet_15_name);
        console.log("Completed test for interruption of transfer receive with Electrum unavailability");

        // Test for interruption of transfer receive with mercury server unavailability
        let wallet_16_name = "w16";
        let wallet_17_name = "w17";
        await createWallet(clientConfig, wallet_16_name);
        await createWallet(clientConfig, wallet_17_name);
        await interruptTransferReceiveWithMercuryServerUnavailability(clientConfig, wallet_16_name, wallet_17_name);
        console.log("Completed test for interruption of transfer receive with mercury server unavailability");

        // Deposit, iterative self transfer
        let wallet_18_name = "w18";
        await createWallet(clientConfig, wallet_18_name);
        await walletTransfersToItselfTillLocktimeReachesBlockHeightAndWithdraw(clientConfig, wallet_18_name);
        console.log("Completed test for Deposit, iterative self transfer");

        // Send backup tx before expiry
        let wallet_19_name = "w19";
        let wallet_20_name = "w20";
        await createWallet(clientConfig, wallet_19_name);
        await createWallet(clientConfig, wallet_20_name);
        try {
            await walletTransfersToAnotherAndBroadcastsBackupTx(clientConfig, wallet_19_name, wallet_20_name)
            assert.fail("Expected error when sending backup tx before expiry, but no error was thrown");
        } catch (error) {
            console.log("Expected error received: ", error.message);
            assert(error.message.includes("The coin is not expired yet."),
            `Unexpected error message: ${error.message}`);
        }
        console.log("Completed test for send backup tx before expiry");

        // Transfer-sender of coin at expiry
        let wallet_21_name = "w21";
        let wallet_22_name = "w22";
        await createWallet(clientConfig, wallet_21_name);
        await createWallet(clientConfig, wallet_22_name);
        await transferSendAtCoinExpiry(clientConfig, wallet_21_name, wallet_22_name);
        console.log("Completed test for Transfer-sender of coin at expiry");

        // Transfer-receive of coin at expiry
        let wallet_23_name = "w23";
        let wallet_24_name = "w24";
        await createWallet(clientConfig, wallet_23_name);
        await createWallet(clientConfig, wallet_24_name);
        await transferReceiveAtCoinExpiry(clientConfig, wallet_23_name, wallet_24_name);
        console.log("Completed test for Transfer-receive of coin at expiry");

        // Transfer-sender of coin that will make it expired by sending
        let wallet_25_name = "w25";
        let wallet_26_name = "w26";
        await createWallet(clientConfig, wallet_25_name);
        await createWallet(clientConfig, wallet_26_name);
        await transferSendCoinExpiryBySending(clientConfig, wallet_25_name, wallet_26_name);
        console.log("Completed test for Transfer-sender of coin that will make it expired by sending");

        process.exit(0); // Exit successfully
    } catch (error) {
        console.error("Test encountered an error:", error);
        process.exit(1); // Exit with failure
    }
})();
