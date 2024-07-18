import CoinStatus from 'mercuryweblib/coin_enum.js';
import clientConfig from './ClientConfig.js';
import mercuryweblib from 'mercuryweblib';

async function sha256(preimage) {
    let buffer;
    
    if (typeof preimage === 'string') {
        // Check if the string is already in hex format
        if (/^[0-9A-Fa-f]+$/.test(preimage)) {
            // Convert hex string to ArrayBuffer
            buffer = new Uint8Array(preimage.match(/.{1,2}/g).map(byte => parseInt(byte, 16))).buffer;
        } else {
            // Treat as UTF-8 string
            buffer = new TextEncoder().encode(preimage);
        }
    } else if (preimage instanceof ArrayBuffer) {
        buffer = preimage;
    } else if (ArrayBuffer.isView(preimage)) {
        buffer = preimage.buffer;
    } else {
        throw new Error('Unsupported input type');
    }
    
    // Calculate the SHA-256 hash
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
    
    // Convert the hash to a hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
}

const tb04SimpleLightningLatch = async () => {

    let statusMsg = "<li>Starting test TB04 - Simple Lightning Latch</li>"
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

    const paymentHash = await mercuryweblib.paymentHash(clientConfig, wallet1.name, statechainId);

    let transferAddress = await mercuryweblib.newTransferAddress(wallet2.name);

    console.log(paymentHash);

    await mercuryweblib.transferSend(clientConfig, wallet1.name, statechainId, transferAddress.transfer_receive, paymentHash.batchId );

    let transferReceive = await mercuryweblib.transferReceive(clientConfig, wallet2.name);

    if (transferReceive.isThereBatchLocked) {
        statusMsg = statusMsg + "<li>Batch locked for wallet 2.</li>";
        statusText.innerHTML = `<ol>${statusMsg}</ol>`;
    } else {
        statusMsg = statusMsg + "<li>Batch unlocked for wallet 4. Something got wrong.</li>";
        statusText.innerHTML = `<ol>${statusMsg}</ol>`;
    }

    await mercuryweblib.confirmPendingInvoice(clientConfig, wallet1.name, statechainId);

    statusMsg = statusMsg + "<li>Wallet 1 confirmed the invoice.</li>";
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;

    transferReceive = await mercuryweblib.transferReceive(clientConfig, wallet2.name);

    if (transferReceive.isThereBatchLocked) {
        statusMsg = statusMsg + "<li>Batch still locked for wallet 2. Something got wrong.</li>";
        statusText.innerHTML = `<ol>${statusMsg}</ol>`;
    } else {
        statusMsg = statusMsg + "<li>Batch now is unlocked for wallet 4. </li>";
        statusText.innerHTML = `<ol>${statusMsg}</ol>`;
    }

    let toAddress = "tb1qenr4esn602nm7y7p35rvm6qtnthn8mu85cu7jz";

    await mercuryweblib.withdrawCoin(clientConfig, wallet2.name, statechainId, toAddress, null);

    statusMsg = statusMsg + "<li>Coins withdrawn.</li>";
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;

    const { preimage } = await mercuryweblib.retrievePreImage(clientConfig, wallet1.name, statechainId, paymentHash.batchId);
    statusMsg = statusMsg + `<li>The pre-image is ${preimage}.</li>`;
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;

    let hashPreImage = await sha256(preimage);

    statusMsg = statusMsg + `<li>The hash from server is ${paymentHash.hash}.</li>`;
    statusMsg = statusMsg + `<li>The calculated hash is ${hashPreImage}.</li>`;
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;

    statusMsg = statusMsg + "<li>Test TB04 - Simple Lightning Latch.</li>";
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;
}

export { tb04SimpleLightningLatch };
