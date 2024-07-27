import CoinStatus from 'mercuryweblib/coin_enum.js';
import clientConfig from './ClientConfig.js';
import mercuryweblib from 'mercuryweblib';

// docker run --name esplora-container -p 50001:50001 -p 8094:80 --volume $PWD/data_bitcoin_regtest:/data --env CORS_ALLOW=* --rm -i -t blockstream/esplora bash -c "/srv/explorer/run.sh bitcoin-regtest explorer"

/* const checkAddress = async (address) => {

    let response = await fetch(`${clientConfig.esploraServer}/api/address/${address}/utxo`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    let utxo_list = await response.json();

    let found = false;

    for (let unspent of utxo_list) {
        if (unspent.value === coin.amount) {
            return true;
        }
    }

    return false;
}

const depositCoin = async (address, amount) => {

    const data = {
        address,
        amount
    };

    const response = await fetch('http://localhost:3000/deposit_amount', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    if (response.status !== 200) {
        throw new Error('Failed to process deposit');
    }

    // if (response.status === 200) {
    //     const responseData = await response.json();
    //     console.log('Success:', responseData);
    // } else {
    //     throw new Error('Failed to process deposit');
    // }
} */

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

    depositAddressText.textContent = "";

    let toAddress = await mercuryweblib.newTransferAddress(wallet2.name);

    statusMsg = statusMsg + "<li>Transferring to wallet 2.</li>";
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;
    
    await mercuryweblib.transferSend(clientConfig, wallet1.name, statechainId, toAddress.transfer_receive, false, null);

    await mercuryweblib.transferReceive(clientConfig, wallet2.name);

    toAddress = "tb1qenr4esn602nm7y7p35rvm6qtnthn8mu85cu7jz";

    await mercuryweblib.withdrawCoin(clientConfig, wallet2.name, statechainId, toAddress, null, null);

    statusMsg = statusMsg + "<li>Coin withdrawn.</li>";
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;

    statusMsg = statusMsg + "<li>Test TB01 - Simple Transfer completed successfully.</li>";
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;

}

export { tb01ExecuteSimpleTransfer };