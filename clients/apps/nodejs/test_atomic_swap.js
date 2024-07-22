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
        let wallet_1_name = "w_atomic_1";
        let wallet_2_name = "w_atomic_2";
        let wallet_3_name = "w_atomic_3";
        let wallet_4_name = "w_atomic_4";
        await createWallet(clientConfig, wallet_1_name);
        await createWallet(clientConfig, wallet_2_name);
        await createWallet(clientConfig, wallet_3_name);
        await createWallet(clientConfig, wallet_4_name);
        await atomicSwapSuccess(clientConfig, wallet_1_name, wallet_2_name, wallet_3_name, wallet_4_name);
        console.log("Completed test for Successful test - all transfers complete within batch_time complete.");

        // Second party performs transfer-sender with incorrect or missing batch-id. First party should still receive OK.
        let wallet_5_name = "w_atomic_5";
        let wallet_6_name = "w_atomic_6";
        let wallet_7_name = "w_atomic_7";
        let wallet_8_name = "w_atomic_8";
        await createWallet(clientConfig, wallet_5_name);
        await createWallet(clientConfig, wallet_6_name);
        await createWallet(clientConfig, wallet_7_name);
        await createWallet(clientConfig, wallet_8_name);
        await atomicSwapWithSecondBatchIdMissing(clientConfig, wallet_5_name, wallet_6_name, wallet_7_name, wallet_8_name);
        console.log("Completed test for Second party performs transfer-sender with incorrect or missing batch-id. First party should still receive OK.");

        // First party performs transfer-sender without batch_id.
        let wallet_9_name = "w_atomic_9";
        let wallet_10_name = "w_atomic_10";
        let wallet_11_name = "w_atomic_11";
        let wallet_12_name = "w_atomic_12";
        await createWallet(clientConfig, wallet_9_name);
        await createWallet(clientConfig, wallet_10_name);
        await createWallet(clientConfig, wallet_11_name);
        await createWallet(clientConfig, wallet_12_name);
        await atomicSwapWithoutFirstBatchId(clientConfig, wallet_9_name, wallet_10_name, wallet_11_name, wallet_12_name);
        console.log("Completed test for First party performs transfer-sender without batch_id.");
        
        // One party doesn't complete transfer-receiver before the timeout. 
        // Both wallets should be able to repeat transfer-sender and transfer-receiver back to new addresses without error, 
        // after the timeout.
        let wallet_13_name = "w_atomic_13";
        let wallet_14_name = "w_atomic_14";
        let wallet_15_name = "w_atomic_15";
        let wallet_16_name = "w_atomic_16";
        await createWallet(clientConfig, wallet_13_name);
        await createWallet(clientConfig, wallet_14_name);
        await createWallet(clientConfig, wallet_15_name);
        await createWallet(clientConfig, wallet_16_name);
        await atomicSwapWithTimeout(clientConfig, wallet_13_name, wallet_14_name, wallet_15_name, wallet_16_name);
        console.log("Completed test for One party doesn't complete transfer-receiver before the timeout.");

        // First party tries to steal within timeout
        // they perform transfer-sender a second time sending back to one of their own addresses - should fail.
        let wallet_17_name = "w_atomic_17";
        let wallet_18_name = "w_atomic_18";
        let wallet_19_name = "w_atomic_19";
        let wallet_20_name = "w_atomic_20";
        await createWallet(clientConfig, wallet_17_name);
        await createWallet(clientConfig, wallet_18_name);
        await createWallet(clientConfig, wallet_19_name);
        await createWallet(clientConfig, wallet_20_name);
        await atomicSwapWithFirstPartySteal(clientConfig, wallet_17_name, wallet_18_name, wallet_19_name, wallet_20_name);
        console.log("Completed test for First party tries to steal within timeout");

        // Second party tries to steal within timeout
        // they perform transfer-sender a second time sending back to one of their own addresses - should fail.
        let wallet_21_name = "w_atomic_21";
        let wallet_22_name = "w_atomic_22";
        let wallet_23_name = "w_atomic_23";
        let wallet_24_name = "w_atomic_24";
        await createWallet(clientConfig, wallet_21_name);
        await createWallet(clientConfig, wallet_22_name);
        await createWallet(clientConfig, wallet_23_name);
        await createWallet(clientConfig, wallet_24_name);
        await atomicSwapWithSecondPartySteal(clientConfig, wallet_21_name, wallet_22_name, wallet_23_name, wallet_24_name);
        console.log("Completed test for Second party tries to steal within timeout");

        process.exit(0); // Exit successfully
    } catch (error) {
        console.error("Test encountered an error:", error);
        process.exit(1); // Exit with failure
    }
})();