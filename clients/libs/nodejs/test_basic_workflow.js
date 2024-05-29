const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);
const assert = require('node:assert/strict');
const { CoinStatus } = require('./coin_enum');
const c = require('config');

async function lsExample() {
    const { stdout, stderr } = await exec('ls');
    console.log('stdout:', stdout);
    console.error('stderr:', stderr);
  }

async function removeDatabase() {
    try { 
        const { stdout, stderr } = await exec('rm wallet.db');
        // console.log('stdout:', stdout);
        // console.error('stderr:', stderr);
    } catch (e) {  
        // console.error(e);
    }
}

async function createWallet(wallet_name) {
    const { stdout, stderr } = await exec(`node index.js create-wallet ${wallet_name}`);
    let wallet = JSON.parse(stdout);
    assert.equal(wallet.name, wallet_name);
    // console.log('wallet:', wallet);
}

async function newToken(wallet_name) {
    const { stdout, stderr } = await exec(`node index.js new-token ${wallet_name}`);
    let json = JSON.parse(stdout);
    return json;
}

async function listTokens(wallet_name) {
    const { stdout, stderr } = await exec(`node index.js list-tokens ${wallet_name}`);
    let json = JSON.parse(stdout);
    return json;
}

async function getDepositBitcoinAddress(wallet_name, token_id, amount) {
    const { stdout, stderr } = await exec(`node index.js new-deposit-address ${wallet_name} ${token_id} ${amount}`);
    let json = JSON.parse(stdout);
    return json;
}

async function listStatecoins(wallet_name) {
    try {
        const { stdout, stderr } = await exec(`node index.js list-statecoins ${wallet_name}`);
        let json = JSON.parse(stdout);
        return json;
    } catch (e) {
        console.log('e:', e);
        return undefined;
    }
}

async function newTransferAddress(wallet_name) {
    const { stdout, stderr } = await exec(`node index.js new-transfer-address ${wallet_name}`);
    let json = JSON.parse(stdout);
    return json.transfer_receive;
}

async function transferSend(wallet_name, statechain_id, to_address) {
    const { stdout, stderr } = await exec(`node index.js transfer-send ${wallet_name} ${statechain_id} ${to_address}`);
    let json = JSON.parse(stdout);
    return json;
}

async function transferReceive(wallet_name) {
    const { stdout, stderr } = await exec(`node index.js transfer-receive ${wallet_name}`);
    let json = JSON.parse(stdout);
    return json;
}

async function withdraw(wallet_name, statechain_id, to_address) {
    const { stdout, stderr } = await exec(`node index.js withdraw ${wallet_name} ${statechain_id} ${to_address}`);
    let json = JSON.parse(stdout);
    return json.txid;
}

async function broadcastBackupTransaction(wallet_name, statechain_id, to_address) {
    const { stdout, stderr } = await exec(`node index.js broadcast-backup-transaction ${wallet_name} ${statechain_id} ${to_address}`);
    let json = JSON.parse(stdout);
    return json;
}

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function walletTransfersToItselfAndWithdraw(wallet_name) {
    
    const amount = 10000;

    const token = await newToken(wallet_name);
    const tokenId = token.token_id;

    const deposit_info = await getDepositBitcoinAddress(wallet_name, amount);

    let tokenList = await listTokens(wallet_name);

    let usedToken = tokenList.find(token => token.token_id === tokenId);

    assert(usedToken.spent);

    deposit_info["amount"] = amount;
    console.log("deposit_coin: ", deposit_info);

    let coin = undefined;

    while (!coin) {
        const list_coins = await listStatecoins(wallet_name);

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

        let transfer_address = await newTransferAddress(wallet_name);

        console.log("transfer_address: ", transfer_address);

        coin = await transferSend(wallet_name, coin.statechain_id, transfer_address);

        console.log("coin transferSend: ", coin);

        let received_statechain_ids = await transferReceive(wallet_name);

        console.log("received_statechain_ids: ", received_statechain_ids);

        assert(received_statechain_ids.length > 0);
        assert(received_statechain_ids[0] == coin.statechain_id);
    }

    let withdraw_address = "tb1qwrujs6f4gyexsextpf9p50smjtht7p7ypknteu";

    let txid = await withdraw(wallet_name, coin.statechain_id, withdraw_address);

    console.log("txid: ", txid);

};

async function walletTransfersMultipleTimesToItselfAndBroadcastsBackup(wallet_name) {
    for (let i = 0; i < 3; i++) {
        await walletTransfersToItselfAndWithdraw(wallet_name);
    }
}

async function walletTransfersToAnotherAndBroadcastsBackupTx(wallet_1_name, wallet_2_name) {

    const amount = 10000;

    const token = await newToken(wallet_1_name);
    const tokenId = token.token_id;

    const deposit_info = await getDepositBitcoinAddress(wallet_1_name, amount);

    deposit_info["amount"] = amount;
    console.log("deposit_info w1: ", deposit_info);

    let tokenList = await listTokens(wallet_1_name);

    let usedToken = tokenList.find(token => token.token_id === tokenId);

    console.log("usedToken: ", usedToken);

    assert(usedToken.spent);

    let coin = undefined;

    while (!coin) {
        const list_coins = await listStatecoins(wallet_1_name);

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

    let transfer_address = await newTransferAddress(wallet_2_name);

    coin = await transferSend(wallet_1_name, coin.statechain_id, transfer_address);

    let received_statechain_ids = await transferReceive(wallet_2_name);

    console.log("received_statechain_ids: ", received_statechain_ids);

    assert(received_statechain_ids.length > 0);
    assert(received_statechain_ids[0] == coin.statechain_id);

    let withdraw_address = "tb1qwrujs6f4gyexsextpf9p50smjtht7p7ypknteu";

    let txids = await broadcastBackupTransaction(wallet_2_name, received_statechain_ids[0], withdraw_address);

    console.log("txids: ", txids);

}

(async () => {
    let wallet_1_name = "w1";
    let wallet_2_name = "w2";

    await removeDatabase();
    await createWallet(wallet_1_name);
    await createWallet(wallet_2_name);

    await walletTransfersMultipleTimesToItselfAndBroadcastsBackup(wallet_1_name);

    await walletTransfersToAnotherAndBroadcastsBackupTx(wallet_1_name, wallet_2_name)

    await removeDatabase();
})();
