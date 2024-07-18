import { expect } from 'chai'; 
import client_config from '../client_config.js';
import mercurynodejslib from 'mercurynodejslib';
import { promisify } from 'node:util';
import { exec as execCallback } from 'node:child_process';
import { CoinStatus } from 'mercurynodejslib/coin_enum.js';
import crypto from 'crypto';

const exec = promisify(execCallback);

async function removeDatabase() {
  const clientConfig = client_config.load(); 
  await exec(`rm ${clientConfig.databaseFile}`);
}

async function getnewaddress() {
  const generateBlockCommand = `docker exec $(docker ps -qf "name=lnd_docker-bitcoind-1") bitcoin-cli -regtest -rpcuser=user -rpcpassword=pass getnewaddress`;
  const { stdout, stderr } = await exec(generateBlockCommand);
  if (stderr) {
    console.error('Error:', stderr);
    return null;
  }
  return stdout.trim();
}

async function generateBlock(numBlocks, address) {
  const generateBlockCommand = `docker exec $(docker ps -qf "name=lnd_docker-bitcoind-1") bitcoin-cli -regtest -rpcuser=user -rpcpassword=pass generatetoaddress ${numBlocks} ${address}`;
  await exec(generateBlockCommand);
}

async function depositCoin(deposit_address, amountInSats) {
  const amountInBtc = amountInSats / 100000000;

  const sendBitcoinCommand = `docker exec $(docker ps -qf "name=lnd_docker-bitcoind-1") bitcoin-cli -regtest -rpcuser=user -rpcpassword=pass sendtoaddress ${deposit_address} ${amountInBtc}`;
  await exec(sendBitcoinCommand);

}

async function createWallet(clientConfig, walletName) {

  let wallet = await mercurynodejslib.createWallet(clientConfig, walletName);
  expect(wallet.name).to.equal(walletName)
  return wallet;

  // TODO: add more assertions
}

describe('TB04 - Lightning Latch', function() {

  context('Simple Transfer', () => {
    it('should complete successfully', async () => {

      await removeDatabase();
      const clientConfig = client_config.load();
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

      await mercurynodejslib.transferSend(clientConfig, wallet1.name, coin.statechain_id, transferAddress.transfer_receive, paymentHash.batchId);

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
