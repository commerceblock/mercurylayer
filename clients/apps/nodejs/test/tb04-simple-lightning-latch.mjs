import { expect } from 'chai'; 
import client_config from '../client_config.js';
import mercurynodejslib from 'mercurynodejslib';
import { CoinStatus } from 'mercurynodejslib/coin_enum.js';
import crypto from 'crypto';
import { getDatabase, sleep, createWallet, getElectrumClient, generateBlock, depositCoin, connectElectr, disconnectElectr, disconnectMercuryServer, connectMercuryServer  } from '../test_utils.js';

describe('TB04 - Lightning Latch', function() {
  this.timeout(3000);

  context('Simple Transfer', () => {
    it('should complete successfully', async () => {

      // await removeDatabase();
      const clientConfig = client_config.load();
      let wallet_1_name = "w1";
      let wallet_2_name = "w2";
      await createWallet(clientConfig, wallet_1_name);
      await createWallet(clientConfig, wallet_2_name);

      const token = await mercurynodejslib.newToken(clientConfig, wallet_1_name);
      const tokenId = token.token_id;

      const amount = 10000;
      const depositInfo = await mercurynodejslib.getDepositBitcoinAddress(clientConfig, wallet_1_name, amount);

      const tokenList = await mercurynodejslib.getWalletTokens(clientConfig, wallet_1_name);
      const usedToken = tokenList.find(token => token.token_id === tokenId);

      expect(usedToken.spent).is.true;

      await depositCoin(clientConfig, wallet_1_name, amount, depositInfo);

      const listCoins = await mercurynodejslib.listStatecoins(clientConfig, wallet_1_name);

      expect(listCoins.length).to.equal(1);

      const coin = listCoins[0];

      expect(coin.status).to.equal(CoinStatus.CONFIRMED);

      const paymentHash = await mercurynodejslib.paymentHash(clientConfig, wallet_1_name, coin.statechain_id);

      const transferAddress = await mercurynodejslib.newTransferAddress(clientConfig, wallet_2_name, null);

      await mercurynodejslib.transferSend(clientConfig, wallet_1_name, coin.statechain_id, transferAddress.transfer_receive, paymentHash.batchId);

      let transferReceiveResult = await mercurynodejslib.transferReceive(clientConfig, wallet_2_name);

      expect(transferReceiveResult.isThereBatchLocked).is.true;
      expect(transferReceiveResult.receivedStatechainIds).empty;

      await mercurynodejslib.confirmPendingInvoice(clientConfig, wallet_1_name, coin.statechain_id);

      transferReceiveResult = await mercurynodejslib.transferReceive(clientConfig, wallet_2_name);

      expect(transferReceiveResult.isThereBatchLocked).is.false;
      expect(transferReceiveResult.receivedStatechainIds).not.empty;

      const { preimage } = await mercurynodejslib.retrievePreImage(clientConfig, wallet_1_name, coin.statechain_id, paymentHash.batchId);

      const hash = crypto.createHash('sha256')
          .update(Buffer.from(preimage, 'hex'))
          .digest('hex')

      expect(hash).to.equal(paymentHash.hash);
    })
  })
})
