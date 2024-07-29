import CoinStatus from 'mercuryweblib/coin_enum.js';
import clientConfig from './ClientConfig.js';
import mercuryweblib from 'mercuryweblib';
import { generateBlocks, depositCoin } from './test-utils.js';

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
    let areBlocksGenerated = false;

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

    const paymentHash = await mercuryweblib.paymentHash(clientConfig, wallet1.name, statechainId);

    let transferAddress = await mercuryweblib.newTransferAddress(wallet2.name);

    console.log(paymentHash);

    await mercuryweblib.transferSend(clientConfig, wallet1.name, statechainId, transferAddress.transfer_receive, false, paymentHash.batchId );

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

    let toAddress = "bcrt1q805t9k884s5qckkxv7l698hqlz7t6alsfjsqym";

    await mercuryweblib.withdrawCoin(clientConfig, wallet2.name, statechainId, toAddress, null, null);

    statusMsg = statusMsg + "<li>Coins withdrawn.</li>";
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;

    const { preimage } = await mercuryweblib.retrievePreImage(clientConfig, wallet1.name, statechainId, paymentHash.batchId);
    statusMsg = statusMsg + `<li>The pre-image is ${preimage}.</li>`;
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;

    let hashPreImage = await sha256(preimage);

    statusMsg = statusMsg + `<li>The hash from server is ${paymentHash.hash}.</li>`;
    statusMsg = statusMsg + `<li>The calculated hash is ${hashPreImage}.</li>`;
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;

    if (paymentHash.hash === hashPreImage) {
        statusMsg = statusMsg + "<li>Hashes match.</li>";
    }

    statusMsg = statusMsg + "<li>Test TB04 - Simple Lightning Latch completed successfully.</li>";
    statusText.innerHTML = `<ol>${statusMsg}</ol>`;
}

export { tb04SimpleLightningLatch };
