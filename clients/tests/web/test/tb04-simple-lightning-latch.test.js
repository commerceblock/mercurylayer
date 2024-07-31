import { describe, test, expect } from "vitest";

import CoinStatus from 'mercuryweblib/coin_enum.js';
import clientConfig from '../ClientConfig.js';
import mercuryweblib from 'mercuryweblib';
import { generateBlocks, depositCoin } from '../test-utils.js';

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

describe('TB04 - Simple Lightning Latch', () => {
    test("expected flow", async () => {

        localStorage.removeItem("mercury-layer:wallet1_tb04");
        localStorage.removeItem("mercury-layer:wallet2_tb04");

        let wallet1 = await mercuryweblib.createWallet(clientConfig, "wallet1_tb04");
        let wallet2 = await mercuryweblib.createWallet(clientConfig, "wallet2_tb04");

        await mercuryweblib.newToken(clientConfig, wallet1.name);

        const amount = 1000;
        
        let result = await mercuryweblib.getDepositBitcoinAddress(clientConfig, wallet1.name, amount);

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
                } else if (coin.statechain_id === statechainId && coin.status === CoinStatus.CONFIRMED) {
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

        const paymentHash = await mercuryweblib.paymentHash(clientConfig, wallet1.name, statechainId);

        let transferAddress = await mercuryweblib.newTransferAddress(wallet2.name);

        await mercuryweblib.transferSend(clientConfig, wallet1.name, statechainId, transferAddress.transfer_receive, false, paymentHash.batchId );

        let transferReceive = await mercuryweblib.transferReceive(clientConfig, wallet2.name);

        expect(transferReceive.isThereBatchLocked).toBe(true);

        await mercuryweblib.confirmPendingInvoice(clientConfig, wallet1.name, statechainId);

        transferReceive = await mercuryweblib.transferReceive(clientConfig, wallet2.name);

        expect(transferReceive.isThereBatchLocked).toBe(false);

        let toAddress = "bcrt1q805t9k884s5qckkxv7l698hqlz7t6alsfjsqym";

        await mercuryweblib.withdrawCoin(clientConfig, wallet2.name, statechainId, toAddress, null, null);

        const { preimage } = await mercuryweblib.retrievePreImage(clientConfig, wallet1.name, statechainId, paymentHash.batchId);

        let hashPreImage = await sha256(preimage);

        expect(hashPreImage).toEqual(paymentHash.hash);
    });
}, 50000);