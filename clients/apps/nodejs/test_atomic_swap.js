const assert = require('node:assert/strict');
const mercurynodejslib = require('mercurynodejslib');
const { CoinStatus } = require('mercurynodejslib/coin_enum');
const { sleep, createWallet, generateBlock, depositCoin  } = require('./test_utils');
const client_config = require('./client_config');

async function atomicSwapSuccess(clientConfig, wallet_1_name, wallet_2_name, wallet_3_name, wallet_4_name) {

    const amount = 10000;
    let token = undefined;
    let tokenId = undefined;
    let deposit_info = undefined;
    let tokenList = undefined;
    let usedToken = undefined;

    token = await mercurynodejslib.newToken(clientConfig, wallet_1_name);
    tokenId = token.token_id;

    deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_1_name, amount);

    tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_1_name);

    usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);
    
    await depositCoin(clientConfig, wallet_1_name, amount, deposit_info);

    let coin1 = undefined;

    console.log("coin: ", coin1);

    while (!coin1) {
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

        coin1 = coinsWithStatechainId[0];
        break;
    }

    console.log("coin: ", coin1);

    token = await mercurynodejslib.newToken(clientConfig, wallet_2_name);
    tokenId = token.token_id;

    deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_2_name, amount);

    tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_2_name);

    usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);
    
    await depositCoin(clientConfig, wallet_2_name, amount, deposit_info);

    let coin2 = undefined;

    console.log("coin: ", coin2);

    while (!coin2) {
        const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_2_name);

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

        coin2 = coinsWithStatechainId[0];
        break;
    }

    console.log("coin: ", coin2);

    const generateBatchId = true;

    let transfer_address_w3 = await mercurynodejslib.newTransferAddress(clientConfig, wallet_3_name, generateBatchId);
    let transfer_address_w4 = await mercurynodejslib.newTransferAddress(clientConfig, wallet_4_name, null);

    let coin3 = await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin1.statechain_id, transfer_address_w3.transfer_receive, transfer_address_w3.batchId);
    console.log("coin transferSend: ", coin3);

    let coin4 = await mercurynodejslib.transferSend(clientConfig, wallet_2_name, coin2.statechain_id, transfer_address_w4.transfer_receive, transfer_address_w3.batchId);
    console.log("coin transferSend: ", coin4);

    let transferReceiveResult = await mercurynodejslib.transferReceive(clientConfig, wallet_3_name);
    console.log("transferReceiveResult: ", transferReceiveResult);
    assert(transferReceiveResult.isThereBatchLocked === true);

    transferReceiveResult = await mercurynodejslib.transferReceive(clientConfig, wallet_4_name);
    let received_statechain_ids_w4 = transferReceiveResult.receivedStatechainIds;

    console.log("received_statechain_ids: ", received_statechain_ids_w4);

    assert(received_statechain_ids_w4.length > 0);
    assert(received_statechain_ids_w4[0] == coin4.statechain_id);

    // transferReceiveResult = await mercurynodejslib.transferReceive(clientConfig, wallet_3_name);
    // received_statechain_ids_w3 = transferReceiveResult.receivedStatechainIds;

    // console.log("received_statechain_ids: ", received_statechain_ids_w3);

    // assert(received_statechain_ids_w3.length > 0);
    // assert(received_statechain_ids_w3[0] == coin3.statechain_id);
}

async function atomicSwapWithSecondBatchIdMissing(clientConfig, wallet_1_name, wallet_2_name, wallet_3_name, wallet_4_name) {

    const amount = 10000;
    let token = undefined;
    let tokenId = undefined;
    let deposit_info = undefined;
    let tokenList = undefined;
    let usedToken = undefined;

    token = await mercurynodejslib.newToken(clientConfig, wallet_1_name);
    tokenId = token.token_id;

    deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_1_name, amount);

    tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_1_name);

    usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);
    
    await depositCoin(clientConfig, wallet_1_name, amount, deposit_info);

    let coin1 = undefined;

    console.log("coin: ", coin1);

    while (!coin1) {
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

        coin1 = coinsWithStatechainId[0];
        break;
    }

    console.log("coin: ", coin1);

    token = await mercurynodejslib.newToken(clientConfig, wallet_2_name);
    tokenId = token.token_id;

    deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_2_name, amount);

    tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_2_name);

    usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);
    
    await depositCoin(clientConfig, wallet_2_name, amount, deposit_info);

    let coin2 = undefined;

    console.log("coin: ", coin2);

    while (!coin2) {
        const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_2_name);

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

        coin2 = coinsWithStatechainId[0];
        break;
    }

    console.log("coin: ", coin2);

    const generateBatchId = true;

    let transfer_address_w3 = await mercurynodejslib.newTransferAddress(clientConfig, wallet_3_name, generateBatchId);
    let transfer_address_w4 = await mercurynodejslib.newTransferAddress(clientConfig, wallet_4_name, null);

    let coin3 = await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin1.statechain_id, transfer_address_w3.transfer_receive, transfer_address_w3.batchId);
    console.log("coin transferSend: ", coin3);

    transfer_address_w3.batchId = "";

    let coin4 = await mercurynodejslib.transferSend(clientConfig, wallet_2_name, coin2.statechain_id, transfer_address_w4.transfer_receive, transfer_address_w3.batchId);
    console.log("coin transferSend: ", coin4);

    let transferReceiveResult = await mercurynodejslib.transferReceive(clientConfig, wallet_3_name);
    let received_statechain_ids_w3 = transferReceiveResult.receivedStatechainIds;

    console.log("received_statechain_ids: ", received_statechain_ids_w3);

    assert(received_statechain_ids_w3.length > 0);
    assert(received_statechain_ids_w3[0] == coin3.statechain_id);

    transferReceiveResult = await mercurynodejslib.transferReceive(clientConfig, wallet_4_name);
    let received_statechain_ids_w4 = transferReceiveResult.receivedStatechainIds;

    console.log("received_statechain_ids: ", received_statechain_ids_w4);

    assert(received_statechain_ids_w4.length > 0);
    assert(received_statechain_ids_w4[0] == coin4.statechain_id);
}

async function atomicSwapWithoutFirstBatchId(clientConfig, wallet_1_name, wallet_2_name, wallet_3_name, wallet_4_name) {

    const amount = 10000;
    let token = undefined;
    let tokenId = undefined;
    let deposit_info = undefined;
    let tokenList = undefined;
    let usedToken = undefined;

    token = await mercurynodejslib.newToken(clientConfig, wallet_1_name);
    tokenId = token.token_id;

    deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_1_name, amount);

    tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_1_name);

    usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);
    
    await depositCoin(clientConfig, wallet_1_name, amount, deposit_info);

    let coin1 = undefined;

    console.log("coin: ", coin1);

    while (!coin1) {
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

        coin1 = coinsWithStatechainId[0];
        break;
    }

    console.log("coin: ", coin1);

    token = await mercurynodejslib.newToken(clientConfig, wallet_2_name);
    tokenId = token.token_id;

    deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_2_name, amount);

    tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_2_name);

    usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);
    
    await depositCoin(clientConfig, wallet_2_name, amount, deposit_info);

    let coin2 = undefined;

    console.log("coin: ", coin2);

    while (!coin2) {
        const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_2_name);

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

        coin2 = coinsWithStatechainId[0];
        break;
    }

    console.log("coin: ", coin2);

    const generateBatchId = true;

    let transfer_address_w3 = await mercurynodejslib.newTransferAddress(clientConfig, wallet_3_name, generateBatchId);
    let transfer_address_w4 = await mercurynodejslib.newTransferAddress(clientConfig, wallet_4_name, null);

    let coin3 = await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin1.statechain_id, transfer_address_w3.transfer_receive, null);
    console.log("coin transferSend: ", coin3);

    let coin4 = await mercurynodejslib.transferSend(clientConfig, wallet_2_name, coin2.statechain_id, transfer_address_w4.transfer_receive, transfer_address_w3.batchId);
    console.log("coin transferSend: ", coin4);

    let transferReceiveResult = await mercurynodejslib.transferReceive(clientConfig, wallet_3_name);
    let received_statechain_ids_w3 = transferReceiveResult.receivedStatechainIds;

    console.log("received_statechain_ids: ", received_statechain_ids_w3);

    assert(received_statechain_ids_w3.length > 0);
    assert(received_statechain_ids_w3[0] == coin3.statechain_id);

    transferReceiveResult = await mercurynodejslib.transferReceive(clientConfig, wallet_4_name);
    let received_statechain_ids_w4 = transferReceiveResult.receivedStatechainIds;

    console.log("received_statechain_ids: ", received_statechain_ids_w4);

    assert(received_statechain_ids_w4.length > 0);
    assert(received_statechain_ids_w4[0] == coin4.statechain_id);
}

async function atomicSwapWithTimeout(clientConfig, wallet_1_name, wallet_2_name, wallet_3_name, wallet_4_name) {

    const amount = 10000;
    let token = undefined;
    let tokenId = undefined;
    let deposit_info = undefined;
    let tokenList = undefined;
    let usedToken = undefined;

    token = await mercurynodejslib.newToken(clientConfig, wallet_1_name);
    tokenId = token.token_id;

    deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_1_name, amount);

    tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_1_name);

    usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);
    
    await depositCoin(clientConfig, wallet_1_name, amount, deposit_info);

    let coin1 = undefined;

    console.log("coin: ", coin1);

    while (!coin1) {
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

        coin1 = coinsWithStatechainId[0];
        break;
    }

    console.log("coin: ", coin1);

    token = await mercurynodejslib.newToken(clientConfig, wallet_2_name);
    tokenId = token.token_id;

    deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_2_name, amount);

    tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_2_name);

    usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);
    
    await depositCoin(clientConfig, wallet_2_name, amount, deposit_info);

    let coin2 = undefined;

    console.log("coin: ", coin2);

    while (!coin2) {
        const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_2_name);

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

        coin2 = coinsWithStatechainId[0];
        break;
    }

    console.log("coin: ", coin2);

    const generateBatchId = true;

    let transfer_address_w3 = await mercurynodejslib.newTransferAddress(clientConfig, wallet_3_name, generateBatchId);
    let transfer_address_w4 = await mercurynodejslib.newTransferAddress(clientConfig, wallet_4_name, null);

    let coin3 = await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin1.statechain_id, transfer_address_w3.transfer_receive, transfer_address_w3.batchId);
    console.log("coin transferSend: ", coin3);

    let coin4 = await mercurynodejslib.transferSend(clientConfig, wallet_2_name, coin2.statechain_id, transfer_address_w4.transfer_receive, transfer_address_w3.batchId);
    console.log("coin transferSend: ", coin4);

    let transferReceiveResult = await mercurynodejslib.transferReceive(clientConfig, wallet_3_name);
    let received_statechain_ids_w3 = transferReceiveResult.receivedStatechainIds;
    await sleep(20000);

    assert(transferReceiveResult.isThereBatchLocked === true);

    let errorMessage;
    console.error = (msg) => {
        errorMessage = msg;
    };

    transferReceiveResult = await mercurynodejslib.transferReceive(clientConfig, wallet_4_name);
    let received_statechain_ids_w4 = transferReceiveResult.receivedStatechainIds;

    // Assert the captured error message
    const expectedMessage = 'Failed to update transfer message';
    assert.ok(errorMessage.includes(expectedMessage));

    transfer_address_w3 = await mercurynodejslib.newTransferAddress(clientConfig, wallet_3_name, generateBatchId);
    transfer_address_w4 = await mercurynodejslib.newTransferAddress(clientConfig, wallet_4_name, null);

    coin3 = await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin1.statechain_id, transfer_address_w3.transfer_receive, transfer_address_w3.batchId);
    console.log("coin transferSend: ", coin3);

    coin4 = await mercurynodejslib.transferSend(clientConfig, wallet_2_name, coin2.statechain_id, transfer_address_w4.transfer_receive, transfer_address_w3.batchId);
    console.log("coin transferSend: ", coin4);

    transferReceiveResult = await mercurynodejslib.transferReceive(clientConfig, wallet_3_name);
    received_statechain_ids_w3 = transferReceiveResult.receivedStatechainIds;

    transferReceiveResult = await mercurynodejslib.transferReceive(clientConfig, wallet_4_name);
    received_statechain_ids_w4 = transferReceiveResult.receivedStatechainIds;

    console.log("received_statechain_ids: ", received_statechain_ids_w4);

    assert(received_statechain_ids_w4.length > 0);
    assert(received_statechain_ids_w4[0] == coin4.statechain_id);

    // transferReceiveResult = await mercurynodejslib.transferReceive(clientConfig, wallet_3_name);
    // received_statechain_ids_w3 = transferReceiveResult.receivedStatechainIds;

    // console.log("received_statechain_ids: ", received_statechain_ids_w3);

    // assert(received_statechain_ids_w3.length > 0);
    // assert(received_statechain_ids_w3[0] == coin3.statechain_id);
}

async function atomicSwapWithFirstPartySteal(clientConfig, wallet_1_name, wallet_2_name, wallet_3_name, wallet_4_name) {

    const amount = 10000;
    let token = undefined;
    let tokenId = undefined;
    let deposit_info = undefined;
    let tokenList = undefined;
    let usedToken = undefined;

    token = await mercurynodejslib.newToken(clientConfig, wallet_1_name);
    tokenId = token.token_id;

    deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_1_name, amount);

    tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_1_name);

    usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);
    
    await depositCoin(clientConfig, wallet_1_name, amount, deposit_info);

    let coin1 = undefined;

    console.log("coin: ", coin1);

    while (!coin1) {
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

        coin1 = coinsWithStatechainId[0];
        break;
    }

    console.log("coin: ", coin1);

    token = await mercurynodejslib.newToken(clientConfig, wallet_2_name);
    tokenId = token.token_id;

    deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_2_name, amount);

    tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_2_name);

    usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);
    
    await depositCoin(clientConfig, wallet_2_name, amount, deposit_info);

    let coin2 = undefined;

    console.log("coin: ", coin2);

    while (!coin2) {
        const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_2_name);

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

        coin2 = coinsWithStatechainId[0];
        break;
    }

    console.log("coin: ", coin2);

    const generateBatchId = true;

    let transfer_address_w3 = await mercurynodejslib.newTransferAddress(clientConfig, wallet_3_name, generateBatchId);
    let transfer_address_w4 = await mercurynodejslib.newTransferAddress(clientConfig, wallet_4_name, null);

    let coin3 = await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin1.statechain_id, transfer_address_w3.transfer_receive, transfer_address_w3.batchId);
    console.log("coin transferSend: ", coin3);

    let coin4 = await mercurynodejslib.transferSend(clientConfig, wallet_2_name, coin2.statechain_id, transfer_address_w4.transfer_receive, transfer_address_w3.batchId);
    console.log("coin transferSend: ", coin4);

    let transfer_address_w3_for_steal = await mercurynodejslib.newTransferAddress(clientConfig, wallet_3_name, generateBatchId);
    console.log("transfer address for steal", transfer_address_w3_for_steal);

    let coin_to_steal = undefined;
    try {
        coin_to_steal = await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin1.statechain_id, transfer_address_w3_for_steal.transfer_receive, transfer_address_w3.batchId);
    } catch (error) {
        // Assert the captured error message
        const expectedMessage = 'expected a string argument, found undefined';
        assert.ok(error.message.includes(expectedMessage));
    }

    console.log("coin to steal transferSend: ", coin_to_steal);

    let received_statechain_ids_w3 = undefined;
    try {
        received_statechain_ids_w3 = mercurynodejslib.transferReceive(clientConfig, wallet_3_name);
    } catch (error) {
        // Assert the captured error message
        const expectedMessage = 'num_sigs is not correct';
        assert.ok(error.message.includes(expectedMessage));
    }
    await sleep(3000);

    let received_statechain_ids_w4 = undefined; 
    try {
        received_statechain_ids_w4 = await mercurynodejslib.transferReceive(clientConfig, wallet_4_name);
    } catch (error) {
        // Assert the captured error message
        const expectedMessage = 'num_sigs is not correct';
        assert.ok(error.message.includes(expectedMessage));
    }

    try {
        received_statechain_ids_w3 = await mercurynodejslib.transferReceive(clientConfig, wallet_3_name);
    } catch (error) {
        // Assert the captured error message
        const expectedMessage = 'num_sigs is not correct';
        assert.ok(error.message.includes(expectedMessage));
    }
}

async function atomicSwapWithSecondPartySteal(clientConfig, wallet_1_name, wallet_2_name, wallet_3_name, wallet_4_name) {

    const amount = 10000;
    let token = undefined;
    let tokenId = undefined;
    let deposit_info = undefined;
    let tokenList = undefined;
    let usedToken = undefined;

    token = await mercurynodejslib.newToken(clientConfig, wallet_1_name);
    tokenId = token.token_id;

    deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_1_name, amount);

    tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_1_name);

    usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);
    
    await depositCoin(clientConfig, wallet_1_name, amount, deposit_info);

    let coin1 = undefined;

    console.log("coin: ", coin1);

    while (!coin1) {
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

        coin1 = coinsWithStatechainId[0];
        break;
    }

    console.log("coin: ", coin1);

    token = await mercurynodejslib.newToken(clientConfig, wallet_2_name);
    tokenId = token.token_id;

    deposit_info = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_2_name, amount);

    tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_2_name);

    usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);
    
    await depositCoin(clientConfig, wallet_2_name, amount, deposit_info);

    let coin2 = undefined;

    console.log("coin: ", coin2);

    while (!coin2) {
        const list_coins = await mercurynodejslib.listStatecoins(clientConfig, wallet_2_name);

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

        coin2 = coinsWithStatechainId[0];
        break;
    }

    console.log("coin: ", coin2);

    const generateBatchId = true;

    let transfer_address_w3 = await mercurynodejslib.newTransferAddress(clientConfig, wallet_3_name, generateBatchId);
    let transfer_address_w4 = await mercurynodejslib.newTransferAddress(clientConfig, wallet_4_name, null);

    let coin3 = await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin1.statechain_id, transfer_address_w3.transfer_receive, transfer_address_w3.batchId);
    console.log("coin transferSend: ", coin3);

    let coin4 = await mercurynodejslib.transferSend(clientConfig, wallet_2_name, coin2.statechain_id, transfer_address_w4.transfer_receive, transfer_address_w3.batchId);
    console.log("coin transferSend: ", coin4);

    let transfer_address_w4_for_steal = await mercurynodejslib.newTransferAddress(clientConfig, wallet_4_name, generateBatchId);
    console.log("transfer address for steal", transfer_address_w4_for_steal);

    let coin_to_steal = undefined;
    try {
        coin_to_steal = await mercurynodejslib.transferSend(clientConfig, wallet_2_name, coin2.statechain_id, transfer_address_w4_for_steal.transfer_receive, transfer_address_w4.batchId);
    } catch (error) {
        // Assert the captured error message
        const expectedMessage = 'expected a string argument, found undefined';
        assert.ok(error.message.includes(expectedMessage));
    }

    console.log("coin to steal transferSend: ", coin_to_steal);

    let received_statechain_ids_w3 = undefined;
    try {
        received_statechain_ids_w3 = mercurynodejslib.transferReceive(clientConfig, wallet_3_name);
    } catch (error) {
        // Assert the captured error message
        const expectedMessage = 'num_sigs is not correct';
        assert.ok(error.message.includes(expectedMessage));
    }

    let received_statechain_ids_w4 = undefined; 
    try {
        received_statechain_ids_w4 = await mercurynodejslib.transferReceive(clientConfig, wallet_4_name);
    } catch (error) {
        // Assert the captured error message
        const expectedMessage = 'num_sigs is not correct';
        assert.ok(error.message.includes(expectedMessage));
    }

    try {
        received_statechain_ids_w3 = await mercurynodejslib.transferReceive(clientConfig, wallet_3_name);
    } catch (error) {
        // Assert the captured error message
        const expectedMessage = 'num_sigs is not correct';
        assert.ok(error.message.includes(expectedMessage));
    }
}

(async () => {

    try {
        const clientConfig = client_config.load();

        // Successful test - all transfers complete within batch_time complete.
        let wallet_27_name = "w27";
        let wallet_28_name = "w28";
        let wallet_29_name = "w29";
        let wallet_30_name = "w30";
        await createWallet(clientConfig, wallet_27_name);
        await createWallet(clientConfig, wallet_28_name);
        await createWallet(clientConfig, wallet_29_name);
        await createWallet(clientConfig, wallet_30_name);
        await atomicSwapSuccess(clientConfig, wallet_27_name, wallet_28_name, wallet_29_name, wallet_30_name);
        console.log("Completed test for Successful test - all transfers complete within batch_time complete.");

        // Second party performs transfer-sender with incorrect or missing batch-id. First party should still receive OK.
        let wallet_31_name = "w31";
        let wallet_32_name = "w32";
        let wallet_33_name = "w33";
        let wallet_34_name = "w34";
        await createWallet(clientConfig, wallet_31_name);
        await createWallet(clientConfig, wallet_32_name);
        await createWallet(clientConfig, wallet_33_name);
        await createWallet(clientConfig, wallet_34_name);
        await atomicSwapWithSecondBatchIdMissing(clientConfig, wallet_31_name, wallet_32_name, wallet_33_name, wallet_34_name);
        console.log("Completed test for Second party performs transfer-sender with incorrect or missing batch-id. First party should still receive OK.");

        // First party performs transfer-sender without batch_id.
        let wallet_35_name = "w35";
        let wallet_36_name = "w36";
        let wallet_37_name = "w37";
        let wallet_38_name = "w38";
        await createWallet(clientConfig, wallet_35_name);
        await createWallet(clientConfig, wallet_36_name);
        await createWallet(clientConfig, wallet_37_name);
        await createWallet(clientConfig, wallet_38_name);
        await atomicSwapWithoutFirstBatchId(clientConfig, wallet_35_name, wallet_36_name, wallet_37_name, wallet_38_name);
        console.log("Completed test for First party performs transfer-sender without batch_id.");
        
        // One party doesn't complete transfer-receiver before the timeout. 
        // Both wallets should be able to repeat transfer-sender and transfer-receiver back to new addresses without error, 
        // after the timeout.
        let wallet_39_name = "w39";
        let wallet_40_name = "w40";
        let wallet_41_name = "w41";
        let wallet_42_name = "w42";
        await createWallet(clientConfig, wallet_39_name);
        await createWallet(clientConfig, wallet_40_name);
        await createWallet(clientConfig, wallet_41_name);
        await createWallet(clientConfig, wallet_42_name);
        await atomicSwapWithTimeout(clientConfig, wallet_39_name, wallet_40_name, wallet_41_name, wallet_42_name);
        console.log("Completed test for One party doesn't complete transfer-receiver before the timeout.");

        // First party tries to steal within timeout
        // they perform transfer-sender a second time sending back to one of their own addresses - should fail.
        let wallet_43_name = "w43";
        let wallet_44_name = "w44";
        let wallet_45_name = "w45";
        let wallet_46_name = "w46";
        await createWallet(clientConfig, wallet_43_name);
        await createWallet(clientConfig, wallet_44_name);
        await createWallet(clientConfig, wallet_45_name);
        await createWallet(clientConfig, wallet_46_name);
        await atomicSwapWithFirstPartySteal(clientConfig, wallet_43_name, wallet_44_name, wallet_45_name, wallet_46_name);
        console.log("Completed test for First party tries to steal within timeout");

        // Second party tries to steal within timeout
        // they perform transfer-sender a second time sending back to one of their own addresses - should fail.
        let wallet_47_name = "w47";
        let wallet_48_name = "w48";
        let wallet_49_name = "w49";
        let wallet_50_name = "w50";
        await createWallet(clientConfig, wallet_47_name);
        await createWallet(clientConfig, wallet_48_name);
        await createWallet(clientConfig, wallet_49_name);
        await createWallet(clientConfig, wallet_50_name);
        await atomicSwapWithSecondPartySteal(clientConfig, wallet_47_name, wallet_48_name, wallet_49_name, wallet_50_name);
        console.log("Completed test for Second party tries to steal within timeout");

        process.exit(0); // Exit successfully
    } catch (error) {
        console.error("Test encountered an error:", error);
        process.exit(1); // Exit with failure
    }
})();