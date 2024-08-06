import { expect } from 'chai'; 
import client_config from '../client_config.js';
import mercurynodejslib from 'mercurynodejslib';
import { CoinStatus } from 'mercurynodejslib/coin_enum.js';
import crypto from 'crypto';
import { createWallet, removeDatabase, getnewaddress, generateBlock, depositCoin } from './test-utils.mjs';

describe('TB04 - Lightning Latch', function() {

  context('Simple Transfer', () => {
    it('should complete successfully', async () => {

      
      const clientConfig = client_config.load();
      await removeDatabase(clientConfig);

      let wallet_1_name = "w1";
      let wallet_2_name = "w2";
      let wallet1 = await createWallet(clientConfig, wallet_1_name);
      let wallet2 = await createWallet(clientConfig, wallet_2_name);

      const token = await mercurynodejslib.newToken(clientConfig, wallet1.name);
      const tokenId = token.token_id;

      const amount = 10000;
      const depositInfo = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet1.name, amount);

      const tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet1.name);
      const usedToken = tokenList.find(token => token.token_id === tokenId);

      expect(usedToken.spent).is.true;

      await depositCoin(depositInfo.deposit_address, amount);

      const coreWalletAddress = await getnewaddress();

      await generateBlock(clientConfig.confirmationTarget, coreWalletAddress);

      const listCoins = await mercurynodejslib.listStatecoins(clientConfig, wallet1.name);

      expect(listCoins.length).to.equal(1);

      const coin = listCoins[0];

      expect(coin.status).to.equal(CoinStatus.CONFIRMED);

      const paymentHash = await mercurynodejslib.paymentHash(clientConfig, wallet1.name, coin.statechain_id);

      const transferAddress = await mercurynodejslib.newTransferAddress(clientConfig, wallet2.name, null);

      await mercurynodejslib.transferSend(clientConfig, wallet1.name, coin.statechain_id, transferAddress.transfer_receive, false, paymentHash.batchId);

      const hashFromServer = await mercurynodejslib.getPaymentHash(clientConfig, paymentHash.batchId);

      expect(hashFromServer).to.equal(paymentHash.hash);

      let transferReceiveResult = await mercurynodejslib.transferReceive(clientConfig, wallet2.name);

      expect(transferReceiveResult.isThereBatchLocked).is.true;
      expect(transferReceiveResult.receivedStatechainIds).empty;

      await mercurynodejslib.confirmPendingInvoice(clientConfig, wallet1.name, coin.statechain_id);

      transferReceiveResult = await mercurynodejslib.transferReceive(clientConfig, wallet2.name);

      expect(transferReceiveResult.isThereBatchLocked).is.false;
      expect(transferReceiveResult.receivedStatechainIds).not.empty;

      const { preimage } = await mercurynodejslib.retrievePreImage(clientConfig, wallet1.name, coin.statechain_id, paymentHash.batchId);

      const hash = crypto.createHash('sha256')
          .update(Buffer.from(preimage, 'hex'))
          .digest('hex')

      expect(hash).to.equal(paymentHash.hash);
    })
  })
})
