import CoinStatus from 'mercuryweblib/coin_enum.js';
import clientConfig from './ClientConfig.js';
import mercuryweblib from 'mercuryweblib';
import { generateBlocks, depositCoin } from './test-utils.js';

// docker run --name esplora-container -p 50001:50001 -p 8094:80 --volume $PWD/data_bitcoin_regtest:/data --env CORS_ALLOW='*' --rm -i -t blockstream/esplora bash -c "/srv/explorer/run.sh bitcoin-regtest explorer"

const tb01ExecuteSimpleTransfer = async () => {

    let statusMsg = "<li>Starting test TB01 - Simple Transfer</li>"
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
    let areBlocksGenerated = false;
    let isDepositConfirmed = false;

    await depositCoin(result.deposit_address, amount);

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
        
        if (isDepositInMempool && !areBlocksGenerated) {
            areBlocksGenerated = true;
            await generateBlocks(clientConfig.confirmationTarget);
        }

        await new Promise(r => setTimeout(r, 1000));
    }

    depositAddressText.textContent = "";

    let toAddress = await mercuryweblib.newTransferAddress(wallet2.name);

    statusMsg = statusMsg + "<li>Transferring to wallet 2.</li>";
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;
    
    await mercuryweblib.transferSend(clientConfig, wallet1.name, statechainId, toAddress.transfer_receive, false, null);

    const transferReceiveResult = await mercuryweblib.transferReceive(clientConfig, wallet2.name);

    if (transferReceiveResult.receivedStatechainIds.includes(statechainId) && transferReceiveResult.receivedStatechainIds.length === 1) {
        statusMsg = statusMsg + "<li>Transfer received correctly.</li>";
        statusText.innerHTML = `<ol>${statusMsg}</ol>`;
    } else {
        statusMsg = statusMsg + "<li>Transfer not received correctly.</li>";
        statusText.innerHTML = `<ol>${statusMsg}</ol>`;
    }

    toAddress = "bcrt1q805t9k884s5qckkxv7l698hqlz7t6alsfjsqym";

    await mercuryweblib.withdrawCoin(clientConfig, wallet2.name, statechainId, toAddress, null, null);

    statusMsg = statusMsg + "<li>Coin withdrawn.</li>";
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;

    statusMsg = statusMsg + "<li>Test TB01 - Simple Transfer completed successfully.</li>";
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;

}

export { tb01ExecuteSimpleTransfer };