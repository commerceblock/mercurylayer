import { describe, test, expect } from "vitest";

import CoinStatus from 'mercuryweblib/coin_enum.js';
import clientConfig from '../ClientConfig.js';
import mercuryweblib from 'mercuryweblib';
import { generateBlocks, depositCoin } from '../test-utils.js';

describe('TA02 - Duplicated Deposits', () => {
    test("withdraw flow", async () => {

        localStorage.removeItem("mercury-layer:wallet1_tb02_1");
        localStorage.removeItem("mercury-layer:wallet2_tb02_1");

        let wallet1 = await mercuryweblib.createWallet(clientConfig, "wallet1_tb02_1");
        let wallet2 = await mercuryweblib.createWallet(clientConfig, "wallet2_tb02_1");

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

        await depositCoin(result.deposit_address, amount);

        while (true) {
            let coins = await mercuryweblib.listStatecoins(clientConfig, wallet1.name);
            let duplicatedCoin = coins.find(coin => coin.statechain_id === statechainId && coin.status === CoinStatus.DUPLICATED);
            if (duplicatedCoin) {
                break;
            }
            await new Promise(r => setTimeout(r, 1000));
        }

        let coins = await mercuryweblib.listStatecoins(clientConfig, wallet1.name);

        const newCoin = coins.find(coin => 
            coin.statechain_id === statechainId && 
            coin.status == CoinStatus.CONFIRMED
        );
        
        const duplicatedCoin = coins.find(coin => 
            coin.statechain_id === statechainId && 
            coin.status == CoinStatus.DUPLICATED
        );

        expect(newCoin).to.not.be.null;
        expect(duplicatedCoin).to.not.be.null;

        let transferAddress = await mercuryweblib.newTransferAddress(wallet2.name);

        try {
            await mercuryweblib.transferSend(clientConfig, wallet1.name, newCoin.statechain_id, transferAddress.transfer_receive, false, null);
        } catch (error) {
            expect(error.message).to.include("Coin is duplicated. If you want to proceed, use the command '--force, -f' option. " + 
                "You will no longer be able to move other duplicate coins with the same statechain_id and this will cause PERMANENT LOSS of these duplicate coin funds.");
        }

        const toAddress = "bcrt1qn5948np2j8t68xgpceneg3ua4wcwhwrsqj8scv";

        let txid = await mercuryweblib.withdrawCoin(clientConfig, wallet1.name, statechainId, toAddress, null, 1);

        expect(txid).to.be.string;

        try {
            await mercuryweblib.transferSend(clientConfig, wallet1.name, newCoin.statechain_id, transferAddress.transfer_receive, false, null);
        } catch (error) {
            expect(error.message).to.include("There have been withdrawals of other coins with this same statechain_id (possibly duplicates). " +
                "This transfer cannot be performed because the recipient would reject it due to the difference in signature count. This coin can be withdrawn, however.");
        }

        txid = await mercuryweblib.withdrawCoin(clientConfig, wallet1.name, statechainId, toAddress, null, 0);

        expect(txid).to.be.string;

    });

    test("transfer flow", async () => {

        localStorage.removeItem("mercury-layer:wallet1_tb02_2");
        localStorage.removeItem("mercury-layer:wallet2_tb02_2");

        let wallet1 = await mercuryweblib.createWallet(clientConfig, "wallet1_tb02_2");
        let wallet2 = await mercuryweblib.createWallet(clientConfig, "wallet2_tb02_2");

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

        await depositCoin(result.deposit_address, amount);

        while (true) {
            let coins = await mercuryweblib.listStatecoins(clientConfig, wallet1.name);
            let duplicatedCoin = coins.find(coin => coin.statechain_id === statechainId && coin.status === CoinStatus.DUPLICATED);
            if (duplicatedCoin) {
                break;
            }
            await new Promise(r => setTimeout(r, 1000));
        }

        let coins = await mercuryweblib.listStatecoins(clientConfig, wallet1.name);

        const newCoin = coins.find(coin => 
            coin.statechain_id === statechainId && 
            coin.status == CoinStatus.CONFIRMED
        );
        
        let duplicatedCoin = coins.find(coin => 
            coin.statechain_id === statechainId && 
            coin.status == CoinStatus.DUPLICATED
        );

        expect(newCoin).to.not.be.null;
        expect(duplicatedCoin).to.not.be.null;

        expect(newCoin.duplicate_index).to.equal(0);
        expect(duplicatedCoin.duplicate_index).to.equal(1);

        let transferAddress = await mercuryweblib.newTransferAddress(wallet2.name);

        result = await mercuryweblib.transferSend(clientConfig, wallet1.name, statechainId, transferAddress.transfer_receive, true, null);
        expect(result).to.have.property('statechain_id');

        let transferReceiveResult = await mercuryweblib.transferReceive(clientConfig, wallet2.name);
        expect(transferReceiveResult.receivedStatechainIds).contains(newCoin.statechain_id);
        expect(transferReceiveResult.receivedStatechainIds.length).to.equal(1);

        coins = await mercuryweblib.listStatecoins(clientConfig, wallet1.name);

        const transferredCoin = coins.find(coin => 
            coin.statechain_id === statechainId && 
            coin.status == CoinStatus.TRANSFERRED
        );
        
        duplicatedCoin = coins.find(coin => 
            coin.statechain_id === statechainId && 
            coin.status == CoinStatus.DUPLICATED
        );

        expect(transferredCoin).to.not.be.null;
        expect(transferredCoin.duplicate_index).to.equal(0);

        expect(duplicatedCoin).to.not.be.null;
        expect(duplicatedCoin.duplicate_index).to.equal(1);

        try {
            const withdrawAddress = "bcrt1qn5948np2j8t68xgpceneg3ua4wcwhwrsqj8scv";
            await mercuryweblib.withdrawCoin(clientConfig, wallet1.name, statechainId, withdrawAddress, null, 1);
        } catch (error) {
            // expect(error.message).to.equal("Signature does not match authentication key.");
            expect(error.message).to.equal("Request failed with status code 401");
        }
    });
}, 100000);