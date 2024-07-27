import CoinStatus from 'mercuryweblib/coin_enum.js';
import clientConfig from './ClientConfig.js';
import mercuryweblib from 'mercuryweblib';

const withdrawFlow = async (statusMsg) => {

    statusMsg = statusMsg + "<li>Starting withdraw flow test</li>";
    const statusText = document.getElementById('statusText');
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;

    localStorage.removeItem("mercury-layer:wallet1");
    localStorage.removeItem("mercury-layer:wallet2");

    let wallet1 = await mercuryweblib.createWallet(clientConfig, "wallet1");
    let wallet2 = await mercuryweblib.createWallet(clientConfig, "wallet2");

    await mercuryweblib.newToken(clientConfig, wallet1.name);

    const amount = 1000;
    
    let result = await mercuryweblib.getDepositBitcoinAddress(clientConfig, wallet1.name, amount);

    const depositAddressText = document.getElementById('depositAddressText');
    depositAddressText.textContent = result.deposit_address;

    const statechainId = result.statechain_id;
    
    let isDepositInMempool = false;
    let isDepositConfirmed = false;

    while (!isDepositConfirmed) {

        const coins = await mercuryweblib.listStatecoins(clientConfig, wallet1.name);
 
        for (let coin of coins) {
            if (coin.statechain_id === statechainId && coin.status === CoinStatus.IN_MEMPOOL && !isDepositInMempool) {
                isDepositInMempool = true;
                statusMsg = statusMsg + "<li>Deposit in mempool. Waiting for deposit to be confirmed.</li>";
                statusText.innerHTML = `<ol>${statusMsg}</ol>`;
            } else if (coin.statechain_id === statechainId && coin.status === CoinStatus.CONFIRMED) {
                statusMsg = statusMsg + "<li>Deposit confirmed.</li>";
                statusText.innerHTML = `<ol>${statusMsg}</ol>`;
                isDepositConfirmed = true;
                break;
            }
        }
        
        await new Promise(r => setTimeout(r, 5000));
    }

    statusMsg = statusMsg + "<li>Waiting for the duplicated deposit.</li>";
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;

    while (true) {
        let coins = await mercuryweblib.listStatecoins(clientConfig, wallet1.name);
        console.log(coins);
        let duplicatedCoin = coins.find(coin => coin.statechain_id === statechainId && coin.status === CoinStatus.DUPLICATED);
        if (duplicatedCoin) {
            statusMsg = statusMsg + "<li>Duplicated deposit found.</li>";
            statusText.innerHTML = `<ol>${statusMsg}</ol>`;
            break;
        }
        await new Promise(r => setTimeout(r, 5000));
    }

    depositAddressText.textContent = "";

    let coins = await mercuryweblib.listStatecoins(clientConfig, wallet1.name);

    const newCoin = coins.find(coin => 
        coin.statechain_id === statechainId && 
        coin.status == CoinStatus.CONFIRMED
    );
      
    const duplicatedCoin = coins.find(coin => 
        coin.statechain_id === statechainId && 
        coin.status == CoinStatus.DUPLICATED
    );

    let transferAddress = await mercuryweblib.newTransferAddress(wallet2.name);

    try {
        await mercuryweblib.transferSend(clientConfig, wallet1.name, newCoin.statechain_id, transferAddress.transfer_receive, false, null);
    } catch (error) {
        console.log(error.message);
        statusMsg = statusMsg + "<li>transferSend correctly throws the 'Coin is duplicated' error.</li>";
        statusText.innerHTML = `<ol>${statusMsg}</ol>`;
    }

    const toAddress = "tb1qenr4esn602nm7y7p35rvm6qtnthn8mu85cu7jz";

    await mercuryweblib.withdrawCoin(clientConfig, wallet1.name, statechainId, toAddress, null, 1);

    statusMsg = statusMsg + "<li>Duplicated coin withdrawn.</li>";
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;

    try {
        await mercuryweblib.transferSend(clientConfig, wallet1.name, newCoin.statechain_id, transferAddress.transfer_receive, false, null);
    } catch (error) {
        console.log(error.message);
        statusMsg = statusMsg + "<li>transferSend correctly throws the 'There have been withdrawals' error.</li>";
        statusText.innerHTML = `<ol>${statusMsg}</ol>`;
    }

    await mercuryweblib.withdrawCoin(clientConfig, wallet1.name, statechainId, toAddress, null, 0);

    statusMsg = statusMsg + "<li>Original coin withdrawn.</li>";
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;

    statusMsg = statusMsg + "<li>Test 'withdraw flow test' completed successfully.</li>";
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;

};

const transferFlow = async (statusMsg) => {

    statusMsg = statusMsg + "<li>Starting transfer flow test</li>";
    const statusText = document.getElementById('statusText');
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;

    localStorage.removeItem("mercury-layer:wallet1");
    localStorage.removeItem("mercury-layer:wallet2");

    let wallet1 = await mercuryweblib.createWallet(clientConfig, "wallet1");
    let wallet2 = await mercuryweblib.createWallet(clientConfig, "wallet2");

    await mercuryweblib.newToken(clientConfig, wallet1.name);

    const amount = 1000;
    
    let result = await mercuryweblib.getDepositBitcoinAddress(clientConfig, wallet1.name, amount);

    const depositAddressText = document.getElementById('depositAddressText');
    depositAddressText.textContent = result.deposit_address;

    const statechainId = result.statechain_id;
    
    let isDepositInMempool = false;
    let isDepositConfirmed = false;

    while (!isDepositConfirmed) {

        const coins = await mercuryweblib.listStatecoins(clientConfig, wallet1.name);
 
        for (let coin of coins) {
            if (coin.statechain_id === statechainId && coin.status === CoinStatus.IN_MEMPOOL && !isDepositInMempool) {
                isDepositInMempool = true;
                statusMsg = statusMsg + "<li>Deposit in mempool. Waiting for deposit to be confirmed.</li>";
                statusText.innerHTML = `<ol>${statusMsg}</ol>`;
            } else if (coin.statechain_id === statechainId && coin.status === CoinStatus.CONFIRMED) {
                statusMsg = statusMsg + "<li>Deposit confirmed.</li>";
                statusText.innerHTML = `<ol>${statusMsg}</ol>`;
                isDepositConfirmed = true;
                break;
            }
        }
        
        await new Promise(r => setTimeout(r, 5000));
    }

    statusMsg = statusMsg + "<li>Waiting for the duplicated deposit.</li>";
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;

    while (true) {
        let coins = await mercuryweblib.listStatecoins(clientConfig, wallet1.name);
        console.log(coins);
        let duplicatedCoin = coins.find(coin => coin.statechain_id === statechainId && coin.status === CoinStatus.DUPLICATED);
        if (duplicatedCoin) {
            statusMsg = statusMsg + "<li>Duplicated deposit found.</li>";
            statusText.innerHTML = `<ol>${statusMsg}</ol>`;
            break;
        }
        await new Promise(r => setTimeout(r, 5000));
    }

    depositAddressText.textContent = "";

    let coins = await mercuryweblib.listStatecoins(clientConfig, wallet1.name);

    const newCoin = coins.find(coin => 
        coin.statechain_id === statechainId && 
        coin.status == CoinStatus.CONFIRMED
    );
      
    let duplicatedCoin = coins.find(coin => 
        coin.statechain_id === statechainId && 
        coin.status == CoinStatus.DUPLICATED
    );

    let transferAddress = await mercuryweblib.newTransferAddress(wallet2.name);

    statusMsg = statusMsg + "<li>Transferring to wallet 2.</li>";
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;
    
    await mercuryweblib.transferSend(clientConfig, wallet1.name, statechainId, transferAddress.transfer_receive, true, null);

    let transferReceiveResult = await mercuryweblib.transferReceive(clientConfig, wallet2.name);

    if (transferReceiveResult.receivedStatechainIds.includes(newCoin.statechain_id) && transferReceiveResult.receivedStatechainIds.length === 1) {
        statusMsg = statusMsg + "<li>Transfer received correctly.</li>";
        statusText.innerHTML = `<ol>${statusMsg}</ol>`;
    } else {
        statusMsg = statusMsg + "<li>Transfer not received correctly.</li>";
        statusText.innerHTML = `<ol>${statusMsg}</ol>`;
    }

    coins = await mercuryweblib.listStatecoins(clientConfig, wallet1.name);

    const transferredCoin = coins.find(coin => 
        coin.statechain_id === statechainId && 
        coin.status == CoinStatus.TRANSFERRED
    );
      
    duplicatedCoin = coins.find(coin => 
        coin.statechain_id === statechainId && 
        coin.status == CoinStatus.DUPLICATED
    );

    if (transferredCoin && transferredCoin.duplicate_index === 0) {
        statusMsg = statusMsg + "<li>Transferred coin found.</li>";
        statusText.innerHTML = `<ol>${statusMsg}</ol>`;
    }

    if (duplicatedCoin && duplicatedCoin.duplicate_index === 1) {
        statusMsg = statusMsg + "<li>Duplicated coin found.</li>";
        statusText.innerHTML = `<ol>${statusMsg}</ol>`;
    }

    try {
        const withdrawAddress = "tb1qenr4esn602nm7y7p35rvm6qtnthn8mu85cu7jz";
        await mercuryweblib.withdrawCoin(clientConfig, wallet1.name, statechainId, withdrawAddress, null, 1);
    } catch (error) {
        console.log(error.message);
    }

    statusMsg = statusMsg + "<li>Test 'transfer flow test' completed successfully.</li>";
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;
}

const tb02DuplicateDeposits = async () => {

    let statusMsg = "<li>Starting test TB01 - Simple Transfer</li>";
    const statusText = document.getElementById('statusText');
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;
    
    // await withdrawFlow(statusMsg);

    await transferFlow(statusMsg);

    statusMsg = statusMsg + "<li>Test 'TA02 - Duplicated Deposits' completed successfully.</li>";
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;

}

export { tb02DuplicateDeposits };