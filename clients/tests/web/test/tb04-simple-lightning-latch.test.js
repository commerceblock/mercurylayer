import { describe, test, expect } from "vitest";

import CoinStatus from 'mercuryweblib/coin_enum.js';
import clientConfig from '../ClientConfig.js';
import mercuryweblib from 'mercuryweblib';
import { generateBlocks, depositCoin, sleep, generateInvoice, payInvoice, payHoldInvoice, settleInvoice } from '../test-utils.js';

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

        const hashFromServer = await mercuryweblib.getPaymentHash(clientConfig, paymentHash.batchId);

        expect(hashFromServer).to.equal(paymentHash.hash);

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

describe('TB04 - The sender tries to get the pre-image before the batch is unlocked should fail', () => {
    test("expected flow", async () => {

        localStorage.removeItem("mercury-layer:wallet1_tb04");
        localStorage.removeItem("mercury-layer:wallet2_tb04");

        let wallet1 = await mercuryweblib.createWallet(clientConfig, "wallet1_tb04");
        let wallet2 = await mercuryweblib.createWallet(clientConfig, "wallet2_tb04");

        await mercuryweblib.newToken(clientConfig, wallet1.name);
        await mercuryweblib.newToken(clientConfig, wallet2.name);

        const amount = 1000;
        
        let result1 = await mercuryweblib.getDepositBitcoinAddress(clientConfig, wallet1.name, amount);
        let result2 = await mercuryweblib.getDepositBitcoinAddress(clientConfig, wallet2.name, amount);

        const statechainId1 = result1.statechain_id;
        const statechainId2 = result2.statechain_id;
    
        let isDepositInMempool1 = false;
        let isDepositConfirmed1 = false;

        let isDepositInMempool2 = false;
        let isDepositConfirmed2 = false;

        let areBlocksGenerated = false;

        await depositCoin(result1.deposit_address, amount);
        await depositCoin(result2.deposit_address, amount);

        while (!isDepositConfirmed2 || !isDepositConfirmed1) {

            let coins = await mercuryweblib.listStatecoins(clientConfig, wallet1.name);
    
            for (let coin of coins) {
                if (coin.statechain_id === statechainId1 && coin.status === CoinStatus.IN_MEMPOOL && !isDepositInMempool1) {
                    isDepositInMempool1 = true;
                } else if (coin.statechain_id === statechainId1 && coin.status === CoinStatus.CONFIRMED) {
                    isDepositConfirmed1 = true;
                }
            }

            coins = await mercuryweblib.listStatecoins(clientConfig, wallet2.name);
    
            for (let coin of coins) {
                if (coin.statechain_id === statechainId2 && coin.status === CoinStatus.IN_MEMPOOL && !isDepositInMempool2) {
                    isDepositInMempool2 = true;
                } else if (coin.statechain_id === statechainId2 && coin.status === CoinStatus.CONFIRMED) {
                    isDepositConfirmed2 = true;
                }
            }
            
            if (isDepositInMempool1 && isDepositInMempool2 && !areBlocksGenerated) {
                areBlocksGenerated = true;
                await generateBlocks(clientConfig.confirmationTarget);
            }

            await new Promise(r => setTimeout(r, 1000));
        }

        const paymentHash1 = await mercuryweblib.paymentHash(clientConfig, wallet1.name, statechainId1);
        const paymentHash2 = await mercuryweblib.paymentHash(clientConfig, wallet2.name, statechainId2);

        let transferAddress1 = await mercuryweblib.newTransferAddress(wallet2.name);
        let transferAddress2 = await mercuryweblib.newTransferAddress(wallet1.name);

        await mercuryweblib.transferSend(clientConfig, wallet1.name, statechainId1, transferAddress1.transfer_receive, false, paymentHash1.batchId );
        await mercuryweblib.transferSend(clientConfig, wallet2.name, statechainId2, transferAddress2.transfer_receive, false, paymentHash2.batchId);

        let transferReceive = await mercuryweblib.transferReceive(clientConfig, wallet2.name);

        expect(transferReceive.isThereBatchLocked).toBe(true);

        try {
            const { preimage } = await mercuryweblib.retrievePreImage(clientConfig, wallet1.name, statechainId1, paymentHash1.batchId);
        } catch (error) {
            // Assert the captured error message
            const expectedMessage = 'Request failed with status code 404';
            expect(error.message).to.equal(expectedMessage);
        }

        await mercuryweblib.confirmPendingInvoice(clientConfig, wallet1.name, statechainId1);
        await mercuryweblib.confirmPendingInvoice(clientConfig, wallet2.name, statechainId2);

        transferReceive = await mercuryweblib.transferReceive(clientConfig, wallet2.name);

        expect(transferReceive.isThereBatchLocked).toBe(false);

        let toAddress = "bcrt1q805t9k884s5qckkxv7l698hqlz7t6alsfjsqym";

        await mercuryweblib.withdrawCoin(clientConfig, wallet2.name, statechainId1, toAddress, null, null);
        await mercuryweblib.withdrawCoin(clientConfig, wallet1.name, statechainId2, toAddress, null, null);

        const { preimage } = await mercuryweblib.retrievePreImage(clientConfig, wallet1.name, statechainId1, paymentHash1.batchId);

        let hashPreImage = await sha256(preimage);

        expect(hashPreImage).toEqual(paymentHash1.hash);
    });
}, 50000);

describe('TB04 - Statecoin sender can recover (resend their coin) after batch timeout without completion', () => {
    test("expected flow", async () => {

        localStorage.removeItem("mercury-layer:wallet1_tb04");
        localStorage.removeItem("mercury-layer:wallet2_tb04");

        let wallet1 = await mercuryweblib.createWallet(clientConfig, "wallet1_tb04");
        let wallet2 = await mercuryweblib.createWallet(clientConfig, "wallet2_tb04");

        await mercuryweblib.newToken(clientConfig, wallet1.name);
        await mercuryweblib.newToken(clientConfig, wallet2.name);

        const amount = 1000;
        
        let result1 = await mercuryweblib.getDepositBitcoinAddress(clientConfig, wallet1.name, amount);
        let result2 = await mercuryweblib.getDepositBitcoinAddress(clientConfig, wallet2.name, amount);

        const statechainId1 = result1.statechain_id;
        const statechainId2 = result2.statechain_id;
    
        let isDepositInMempool1 = false;
        let isDepositConfirmed1 = false;

        let isDepositInMempool2 = false;
        let isDepositConfirmed2 = false;

        let areBlocksGenerated = false;

        await depositCoin(result1.deposit_address, amount);
        await depositCoin(result2.deposit_address, amount);

        while (!isDepositConfirmed2 || !isDepositConfirmed1) {

            let coins = await mercuryweblib.listStatecoins(clientConfig, wallet1.name);
    
            for (let coin of coins) {
                if (coin.statechain_id === statechainId1 && coin.status === CoinStatus.IN_MEMPOOL && !isDepositInMempool1) {
                    isDepositInMempool1 = true;
                } else if (coin.statechain_id === statechainId1 && coin.status === CoinStatus.CONFIRMED) {
                    isDepositConfirmed1 = true;
                }
            }

            coins = await mercuryweblib.listStatecoins(clientConfig, wallet2.name);
    
            for (let coin of coins) {
                if (coin.statechain_id === statechainId2 && coin.status === CoinStatus.IN_MEMPOOL && !isDepositInMempool2) {
                    isDepositInMempool2 = true;
                } else if (coin.statechain_id === statechainId2 && coin.status === CoinStatus.CONFIRMED) {
                    isDepositConfirmed2 = true;
                }
            }
            
            if (isDepositInMempool1 && isDepositInMempool2 && !areBlocksGenerated) {
                areBlocksGenerated = true;
                await generateBlocks(clientConfig.confirmationTarget);
            }

            await new Promise(r => setTimeout(r, 1000));
        }

        const paymentHash1 = await mercuryweblib.paymentHash(clientConfig, wallet1.name, statechainId1);
        const paymentHash2 = await mercuryweblib.paymentHash(clientConfig, wallet2.name, statechainId2);

        let transferAddress1 = await mercuryweblib.newTransferAddress(wallet2.name);
        let transferAddress2 = await mercuryweblib.newTransferAddress(wallet1.name);

        await mercuryweblib.transferSend(clientConfig, wallet1.name, statechainId1, transferAddress1.transfer_receive, false, paymentHash1.batchId );
        await mercuryweblib.transferSend(clientConfig, wallet2.name, statechainId2, transferAddress2.transfer_receive, false, paymentHash2.batchId);

        let transferReceive = await mercuryweblib.transferReceive(clientConfig, wallet2.name);

        expect(transferReceive.isThereBatchLocked).toBe(true);

        await mercuryweblib.confirmPendingInvoice(clientConfig, wallet1.name, statechainId1);
        await mercuryweblib.confirmPendingInvoice(clientConfig, wallet2.name, statechainId2);

        await sleep(20000);

        let errorMessage;
        console.error = (msg) => {
            errorMessage = msg;
        };

        transferReceive = await mercuryweblib.transferReceive(clientConfig, wallet2.name);

        // Assert the captured error message
        const expectedMessage = 'Failed to update transfer message';
        expect(errorMessage).contains(expectedMessage);

        let transferAddress3 = await mercuryweblib.newTransferAddress(wallet2.name);
        let transferAddress4 = await mercuryweblib.newTransferAddress(wallet1.name);

        await mercuryweblib.transferSend(clientConfig, wallet1.name, statechainId1, transferAddress3.transfer_receive, false, paymentHash2.batchId );
        await mercuryweblib.transferSend(clientConfig, wallet2.name, statechainId2, transferAddress4.transfer_receive, false, paymentHash2.batchId);

        transferReceive = await mercuryweblib.transferReceive(clientConfig, wallet1.name);

        await mercuryweblib.confirmPendingInvoice(clientConfig, wallet1.name, statechainId1);
        await mercuryweblib.confirmPendingInvoice(clientConfig, wallet2.name, statechainId2);

        expect(transferReceive.isThereBatchLocked).toBe(false);

        let toAddress = "bcrt1q805t9k884s5qckkxv7l698hqlz7t6alsfjsqym";

        await mercuryweblib.withdrawCoin(clientConfig, wallet2.name, statechainId1, toAddress, null, null);
        await mercuryweblib.withdrawCoin(clientConfig, wallet1.name, statechainId2, toAddress, null, null);

        const { preimage } = await mercuryweblib.retrievePreImage(clientConfig, wallet1.name, statechainId1, paymentHash1.batchId);

        let hashPreImage = await sha256(preimage);

        expect(hashPreImage).toEqual(paymentHash1.hash);
    });
}, 50000);

describe('TB04 - Statecoin trade with invoice creation, payment and settlement', () => {
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

        const invoice = await generateInvoice(paymentHash.hash, amount);

        payInvoice(invoice.payment_request);

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

        await settleInvoice(preimage);
    });
}, 50000);

describe('TB04 - Receiver tries to transfer invoice amount to another invoice before preimage retrieval should fail', () => {
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

        const invoice = await generateInvoice(paymentHash.hash, amount);

        payHoldInvoice(invoice.payment_request);

        let transferAddress = await mercuryweblib.newTransferAddress(wallet2.name);

        await mercuryweblib.transferSend(clientConfig, wallet1.name, statechainId, transferAddress.transfer_receive, false, paymentHash.batchId );

        const hashFromServer = await mercurynodejslib.getPaymentHash(clientConfig, paymentHash.batchId);

        expect(hashFromServer).to.equal(paymentHash.hash);

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

        const paymentHashSecond = "4f67f0a4bc4a8a6a8ecb944e9b748ed7c27655fbdb4c4d3f045d7f18c1e4de64"
        const invoiceSecond = await generateInvoice(paymentHashSecond, amount);
  
        try {
          await payInvoice(invoiceSecond.payment_request);
        } catch (error) {
          console.error('Error:', error);
          expect(error.message).to.include('failed');
        }
    });
}, 50000);