import { describe, test, expect } from "vitest";

import CoinStatus from 'mercuryweblib/coin_enum.js';
import clientConfig from '../ClientConfig.js';
import mercuryweblib from 'mercuryweblib';
import { generateBlocks, depositCoin } from '../test-utils.js';

describe('TB01 - Simple Transfer', () => {
    test("expected flow", async () => {

        localStorage.removeItem("mercury-layer:wallet1_tb01");
        localStorage.removeItem("mercury-layer:wallet2_tb01");

        let wallet1 = await mercuryweblib.createWallet(clientConfig, "wallet1_tb01");
        let wallet2 = await mercuryweblib.createWallet(clientConfig, "wallet2_tb01");

        await mercuryweblib.newToken(clientConfig, wallet1.name);

        const amount = 1000;
        
        let result = await mercuryweblib.getDepositBitcoinAddress(clientConfig, wallet1.name, amount);

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

        let toAddress = await mercuryweblib.newTransferAddress(wallet2.name);

        await mercuryweblib.transferSend(clientConfig, wallet1.name, statechainId, toAddress.transfer_receive, false, null);

        const transferReceiveResult = await mercuryweblib.transferReceive(clientConfig, wallet2.name);

        expect(transferReceiveResult.receivedStatechainIds).includes(statechainId);
        expect(transferReceiveResult.receivedStatechainIds.length).toEqual(1);

        toAddress = "bcrt1q805t9k884s5qckkxv7l698hqlz7t6alsfjsqym";

        await mercuryweblib.withdrawCoin(clientConfig, wallet2.name, statechainId, toAddress, null, null);

    });
}, 50000);