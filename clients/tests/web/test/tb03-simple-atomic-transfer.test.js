import { describe, test, expect } from "vitest";

import CoinStatus from 'mercuryweblib/coin_enum.js';
import clientConfig from '../ClientConfig.js';
import mercuryweblib from 'mercuryweblib';
import { generateBlocks, depositCoin, sleep } from '../test-utils.js';

describe('TB03 - Simple Atomic Transfer', () => {
    test("expected flow", async () => {

        localStorage.removeItem("mercury-layer:wallet1_tb03");
        localStorage.removeItem("mercury-layer:wallet2_tb03");
        localStorage.removeItem("mercury-layer:wallet3_tb03");
        localStorage.removeItem("mercury-layer:wallet4_tb03");

        let wallet1 = await mercuryweblib.createWallet(clientConfig, "wallet1_tb03");
        let wallet2 = await mercuryweblib.createWallet(clientConfig, "wallet2_tb03");
        let wallet3 = await mercuryweblib.createWallet(clientConfig, "wallet3_tb03");
        let wallet4 = await mercuryweblib.createWallet(clientConfig, "wallet4_tb03");

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

        const toAddress3 = await mercuryweblib.newTransferAddress(wallet3.name, true);
        const toAddress4 = await mercuryweblib.newTransferAddress(wallet4.name);

        await mercuryweblib.transferSend(clientConfig, wallet1.name, statechainId1, toAddress3.transfer_receive, false, toAddress3.batch_id);
        await mercuryweblib.transferSend(clientConfig, wallet2.name, statechainId2, toAddress4.transfer_receive, false, toAddress3.batch_id);

        let transferReceive3 = await mercuryweblib.transferReceive(clientConfig, wallet3.name);

        expect(transferReceive3.isThereBatchLocked).toBe(true);

        const transferReceive4 = await mercuryweblib.transferReceive(clientConfig, wallet4.name);

        expect(transferReceive4.isThereBatchLocked).toBe(false);

        transferReceive3 = await mercuryweblib.transferReceive(clientConfig, wallet3.name);

        expect(transferReceive3.isThereBatchLocked).toBe(false);

        const toAddress = "bcrt1q805t9k884s5qckkxv7l698hqlz7t6alsfjsqym";

        await mercuryweblib.withdrawCoin(clientConfig, wallet3.name, statechainId1, toAddress, null, null);

        await mercuryweblib.withdrawCoin(clientConfig, wallet4.name, statechainId2, toAddress, null, null);

    });
}, 50000);

describe('TB03 - Atomic swap with second batchid missing', () => {
    test("expected flow", async () => {

        localStorage.removeItem("mercury-layer:wallet1_tb03");
        localStorage.removeItem("mercury-layer:wallet2_tb03");
        localStorage.removeItem("mercury-layer:wallet3_tb03");
        localStorage.removeItem("mercury-layer:wallet4_tb03");

        let wallet1 = await mercuryweblib.createWallet(clientConfig, "wallet1_tb03");
        let wallet2 = await mercuryweblib.createWallet(clientConfig, "wallet2_tb03");
        let wallet3 = await mercuryweblib.createWallet(clientConfig, "wallet3_tb03");
        let wallet4 = await mercuryweblib.createWallet(clientConfig, "wallet4_tb03");

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

        const toAddress3 = await mercuryweblib.newTransferAddress(wallet3.name, true);
        const toAddress4 = await mercuryweblib.newTransferAddress(wallet4.name);

        await mercuryweblib.transferSend(clientConfig, wallet1.name, statechainId1, toAddress3.transfer_receive, false, toAddress3.batch_id);
        await mercuryweblib.transferSend(clientConfig, wallet2.name, statechainId2, toAddress4.transfer_receive, false, "");

        let transferReceive3 = await mercuryweblib.transferReceive(clientConfig, wallet3.name);

        expect(transferReceive3.isThereBatchLocked).toBe(true);

        const transferReceive4 = await mercuryweblib.transferReceive(clientConfig, wallet4.name);

        expect(transferReceive4.isThereBatchLocked).toBe(false);

        transferReceive3 = await mercuryweblib.transferReceive(clientConfig, wallet3.name);

        expect(transferReceive3.isThereBatchLocked).toBe(false);

        const toAddress = "bcrt1q805t9k884s5qckkxv7l698hqlz7t6alsfjsqym";

        await mercuryweblib.withdrawCoin(clientConfig, wallet3.name, statechainId1, toAddress, null, null);

        await mercuryweblib.withdrawCoin(clientConfig, wallet4.name, statechainId2, toAddress, null, null);

    });
}, 50000);

describe('TB03 - Atomic swap without first batchid', () => {
    test("expected flow", async () => {

        localStorage.removeItem("mercury-layer:wallet1_tb03");
        localStorage.removeItem("mercury-layer:wallet2_tb03");
        localStorage.removeItem("mercury-layer:wallet3_tb03");
        localStorage.removeItem("mercury-layer:wallet4_tb03");

        let wallet1 = await mercuryweblib.createWallet(clientConfig, "wallet1_tb03");
        let wallet2 = await mercuryweblib.createWallet(clientConfig, "wallet2_tb03");
        let wallet3 = await mercuryweblib.createWallet(clientConfig, "wallet3_tb03");
        let wallet4 = await mercuryweblib.createWallet(clientConfig, "wallet4_tb03");

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

        const toAddress3 = await mercuryweblib.newTransferAddress(wallet3.name, true);
        const toAddress4 = await mercuryweblib.newTransferAddress(wallet4.name);

        await mercuryweblib.transferSend(clientConfig, wallet1.name, statechainId1, toAddress3.transfer_receive, false, null);
        await mercuryweblib.transferSend(clientConfig, wallet2.name, statechainId2, toAddress4.transfer_receive, false, toAddress3.batch_id);

        let transferReceive3 = await mercuryweblib.transferReceive(clientConfig, wallet3.name);

        expect(transferReceive3.isThereBatchLocked).toBe(true);

        const transferReceive4 = await mercuryweblib.transferReceive(clientConfig, wallet4.name);

        expect(transferReceive4.isThereBatchLocked).toBe(false);

        transferReceive3 = await mercuryweblib.transferReceive(clientConfig, wallet3.name);

        expect(transferReceive3.isThereBatchLocked).toBe(false);

        const toAddress = "bcrt1q805t9k884s5qckkxv7l698hqlz7t6alsfjsqym";

        await mercuryweblib.withdrawCoin(clientConfig, wallet3.name, statechainId1, toAddress, null, null);

        await mercuryweblib.withdrawCoin(clientConfig, wallet4.name, statechainId2, toAddress, null, null);

    });
}, 50000);

describe('TB03 - Atomic swap with timeout', () => {
    test("expected flow", async () => {

        localStorage.removeItem("mercury-layer:wallet1_tb03");
        localStorage.removeItem("mercury-layer:wallet2_tb03");
        localStorage.removeItem("mercury-layer:wallet3_tb03");
        localStorage.removeItem("mercury-layer:wallet4_tb03");

        let wallet1 = await mercuryweblib.createWallet(clientConfig, "wallet1_tb03");
        let wallet2 = await mercuryweblib.createWallet(clientConfig, "wallet2_tb03");
        let wallet3 = await mercuryweblib.createWallet(clientConfig, "wallet3_tb03");
        let wallet4 = await mercuryweblib.createWallet(clientConfig, "wallet4_tb03");

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

        let toAddress3 = await mercuryweblib.newTransferAddress(wallet3.name, true);
        let toAddress4 = await mercuryweblib.newTransferAddress(wallet4.name);

        await mercuryweblib.transferSend(clientConfig, wallet1.name, statechainId1, toAddress3.transfer_receive, false, toAddress3.batch_id);
        await mercuryweblib.transferSend(clientConfig, wallet2.name, statechainId2, toAddress4.transfer_receive, false, toAddress3.batch_id);

        let transferReceive3 = await mercuryweblib.transferReceive(clientConfig, wallet3.name);

        expect(transferReceive3.isThereBatchLocked).toBe(true);

        await sleep(20000);

        let errorMessage;
        console.error = (msg) => {
            errorMessage = msg;
        };

        let transferReceive4 = await mercuryweblib.transferReceive(clientConfig, wallet4.name);

        // Assert the captured error message
        const expectedMessage = 'Failed to update transfer message';
        expect(errorMessage).contains(expectedMessage);

        toAddress3 = await mercuryweblib.newTransferAddress(wallet3.name, true);
        toAddress4 = await mercuryweblib.newTransferAddress(wallet4.name);

        await mercuryweblib.transferSend(clientConfig, wallet1.name, statechainId1, toAddress3.transfer_receive, false, null);
        await mercuryweblib.transferSend(clientConfig, wallet2.name, statechainId2, toAddress4.transfer_receive, false, toAddress3.batch_id);

        transferReceive3 = await mercuryweblib.transferReceive(clientConfig, wallet3.name);

        expect(transferReceive3.isThereBatchLocked).toBe(true);

        transferReceive4 = await mercuryweblib.transferReceive(clientConfig, wallet4.name);

        expect(transferReceive4.isThereBatchLocked).toBe(false);

        transferReceive3 = await mercuryweblib.transferReceive(clientConfig, wallet3.name);

        expect(transferReceive3.isThereBatchLocked).toBe(false);

        const toAddress = "bcrt1q805t9k884s5qckkxv7l698hqlz7t6alsfjsqym";

        await mercuryweblib.withdrawCoin(clientConfig, wallet3.name, statechainId1, toAddress, null, null);

        await mercuryweblib.withdrawCoin(clientConfig, wallet4.name, statechainId2, toAddress, null, null);

    });
}, 50000);