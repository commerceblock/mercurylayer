import CoinStatus from 'mercuryweblib/coin_enum.js';
import clientConfig from './ClientConfig.js';
import mercuryweblib from 'mercuryweblib';

const tb03SimpleAtomicTransfer = async () => {

    let statusMsg = "<li>Starting test TB03 - Simple Atomic Transfer</li>"
    const statusText = document.getElementById('statusText');
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;

    localStorage.removeItem("mercury-layer:wallet1");
    localStorage.removeItem("mercury-layer:wallet2");
    localStorage.removeItem("mercury-layer:wallet3");
    localStorage.removeItem("mercury-layer:wallet4");

    let wallet1 = await mercuryweblib.createWallet(clientConfig, "wallet1");
    let wallet2 = await mercuryweblib.createWallet(clientConfig, "wallet2");
    let wallet3 = await mercuryweblib.createWallet(clientConfig, "wallet3");
    let wallet4 = await mercuryweblib.createWallet(clientConfig, "wallet4");

    await mercuryweblib.newToken(clientConfig, wallet1.name);
    await mercuryweblib.newToken(clientConfig, wallet2.name);

    const amount = 1000;

    let result1 = await mercuryweblib.getDepositBitcoinAddress(clientConfig, wallet1.name, amount);
    let result2 = await mercuryweblib.getDepositBitcoinAddress(clientConfig, wallet2.name, amount);

    const depositAddressText = document.getElementById('depositAddressText');
    depositAddressText.innerHTML = result1.deposit_address + "<br />" + result2.deposit_address;

    const statechainId1 = result1.statechain_id;
    const statechainId2 = result2.statechain_id;
    
    let isDepositInMempool1 = false;
    let isDepositConfirmed1 = false;

    let isDepositInMempool2 = false;
    let isDepositConfirmed2 = false;

    while (!isDepositConfirmed2 && !isDepositConfirmed1) {

        let coins = await mercuryweblib.listStatecoins(clientConfig, wallet1.name);
 
        for (let coin of coins) {
            if (coin.statechain_id === statechainId1 && coin.status === CoinStatus.IN_MEMPOOL && !isDepositInMempool1) {
                isDepositInMempool1 = true;
                statusMsg = statusMsg + "<li>Deposit 1 in mempool. Waiting to be confirmed.</li>";
                statusText.innerHTML = `<ol>${statusMsg}</ol>`;
            } else if (coin.statechain_id === statechainId1 && coin.status === CoinStatus.CONFIRMED) {
                statusMsg = statusMsg + "<li>Deposit 1 confirmed.</li>";
                statusText.innerHTML = `<ol>${statusMsg}</ol>`;
                isDepositConfirmed1 = true;
            }
        }

        console.log("coins 1: ");
        console.log(coins);

        coins = await mercuryweblib.listStatecoins(clientConfig, wallet2.name);
 
        for (let coin of coins) {
            if (coin.statechain_id === statechainId2 && coin.status === CoinStatus.IN_MEMPOOL && !isDepositInMempool2) {
                isDepositInMempool2 = true;
                statusMsg = statusMsg + "<li>Deposit 2 in mempool. Waiting to be confirmed.</li>";
                statusText.innerHTML = `<ol>${statusMsg}</ol>`;
            } else if (coin.statechain_id === statechainId2 && coin.status === CoinStatus.CONFIRMED) {
                statusMsg = statusMsg + "<li>Deposit 2 confirmed.</li>";
                statusText.innerHTML = `<ol>${statusMsg}</ol>`;
                isDepositConfirmed1 = true;
            }
        }

        console.log("coins 2: ");
        console.log(coins);
        
        await new Promise(r => setTimeout(r, 5000));
    }

    depositAddressText.textContent = "";

    const toAddress3 = await mercuryweblib.newTransferAddress(wallet3.name, true);
    const toAddress4 = await mercuryweblib.newTransferAddress(wallet4.name);

    statusMsg = statusMsg + "<li>Transferring to wallets 3 and 4 with a batch id.</li>";
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;

    await mercuryweblib.transferSend(clientConfig, wallet1.name, statechainId1, toAddress3.transfer_receive, toAddress3.batch_id);
    await mercuryweblib.transferSend(clientConfig, wallet2.name, statechainId2, toAddress4.transfer_receive, toAddress3.batch_id);

    let transferReceive3 = await mercuryweblib.transferReceive(clientConfig, wallet3.name);

    if (transferReceive3.isThereBatchLocked) {
        statusMsg = statusMsg + "<li>Batch locked for wallet 3.</li>";
        statusText.innerHTML = `<ol>${statusMsg}</ol>`;
    } else {
        statusMsg = statusMsg + "<li>Batch not locked for wallet 3. Something got wrong.</li>";
        statusText.innerHTML = `<ol>${statusMsg}</ol>`;
    }

    const transferReceive4 = await mercuryweblib.transferReceive(clientConfig, wallet4.name);

    if (transferReceive4.isThereBatchLocked) {
        statusMsg = statusMsg + "<li>Batch locked for wallet 4. Something got wrong.</li>";
        statusText.innerHTML = `<ol>${statusMsg}</ol>`;
    } else {
        statusMsg = statusMsg + "<li>Batch unlocked for wallet 4.</li>";
        statusText.innerHTML = `<ol>${statusMsg}</ol>`;
    }

    transferReceive3 = await mercuryweblib.transferReceive(clientConfig, wallet3.name);

    if (transferReceive3.isThereBatchLocked) {
        statusMsg = statusMsg + "<li>Batch locked for wallet 3. Something got wrong.</li>";
        statusText.innerHTML = `<ol>${statusMsg}</ol>`;
    } else {
        statusMsg = statusMsg + "<li>Batch is now unlocked for wallet 3.</li>";
        statusText.innerHTML = `<ol>${statusMsg}</ol>`;
    }

    const toAddress = "tb1qenr4esn602nm7y7p35rvm6qtnthn8mu85cu7jz";

    await mercuryweblib.withdrawCoin(clientConfig, wallet3.name, statechainId1, toAddress, null);

    await mercuryweblib.withdrawCoin(clientConfig, wallet4.name, statechainId2, toAddress, null);

    statusMsg = statusMsg + "<li>Coins withdrawn.</li>";
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;

    statusMsg = statusMsg + "<li>Test TB03 - Simple Atomic Transfer completed successfully.</li>";
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;
}

export { tb03SimpleAtomicTransfer };