import { expect } from 'chai'; 
import client_config from '../client_config.js';
import mercurynodejslib from 'mercurynodejslib';
import { CoinStatus } from 'mercurynodejslib/coin_enum.js';
import { createWallet, removeDatabase, getnewaddress, generateBlock, depositCoin } from './test-utils.mjs';

describe('TA02 - Duplicated Deposits', function() {

    context('Withdraw Flow', () => {
        it('should complete successfully', async () => {

            const clientConfig = client_config.load();
            await removeDatabase(clientConfig);

            let wallet_1_name = "w1";
            let wallet_2_name = "w2";
            let wallet1 = await createWallet(clientConfig, wallet_1_name);
            let wallet2 = await createWallet(clientConfig, wallet_2_name);

            const token = await mercurynodejslib.newToken(clientConfig, wallet1.name);
            const tokenId = token.token_id;

            const amount1 = 10000;
            const depositInfo = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet1.name, amount1);

            await depositCoin(depositInfo.deposit_address, amount1);

            let amount2 = 20000;
            await depositCoin(depositInfo.deposit_address, amount2);

            const coreWalletAddress = await getnewaddress();

            await generateBlock(clientConfig.confirmationTarget, coreWalletAddress);

            const listCoins = await mercurynodejslib.listStatecoins(clientConfig, wallet1.name);

            expect(listCoins.length).to.equal(2);

            const newCoin = listCoins.find(coin => 
                coin.aggregated_address == depositInfo.deposit_address && 
                coin.status == CoinStatus.CONFIRMED
            );
              
            const duplicatedCoin = listCoins.find(coin => 
                coin.aggregated_address == depositInfo.deposit_address && 
                coin.status == CoinStatus.DUPLICATED
            );

            expect(newCoin).to.not.be.null;
            expect(duplicatedCoin).to.not.be.null;

            expect(newCoin.duplicate_index).to.equal(0);
            expect(duplicatedCoin.duplicate_index).to.equal(1);

            const transferAddress = await mercurynodejslib.newTransferAddress(clientConfig, wallet2.name, null);

            try {
                await mercurynodejslib.transferSend(clientConfig, wallet1.name, newCoin.statechain_id, transferAddress.transfer_receive, false, null);
            } catch (error) {
                expect(error.message).to.include("Coin is duplicated. If you want to proceed, use the command '--force, -f' option. " + 
                    "You will no longer be able to move other duplicate coins with the same statechain_id and this will cause PERMANENT LOSS of these duplicate coin funds.");
            }

            let withdrawAddress = "bcrt1qn5948np2j8t68xgpceneg3ua4wcwhwrsqj8scv";

            let txid = await mercurynodejslib.withdrawCoin(clientConfig, wallet1.name, duplicatedCoin.statechain_id, withdrawAddress, null, 1);

            expect(txid).to.not.be.string;

            try {
                await mercurynodejslib.transferSend(clientConfig, wallet1.name, newCoin.statechain_id, transferAddress.transfer_receive, false, null);
            } catch (error) {
                expect(error.message).to.include("There have been withdrawals of other coins with this same statechain_id (possibly duplicates). " +
                    "This transfer cannot be performed because the recipient would reject it due to the difference in signature count. This coin can be withdrawn, however.");
            }
            
            txid = await mercurynodejslib.withdrawCoin(clientConfig, wallet1.name, duplicatedCoin.statechain_id, withdrawAddress, null, 0);

            expect(txid).to.not.be.string;
        })
    })
})
