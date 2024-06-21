import axios from 'axios';
import walletManager from './wallet.js';
import storageManager from './storage_manager.js';
import deposit from './deposit.js';
import coin_status from './coin_status.js';
import withdraw from './withdraw.js';
import broadcast_backup_tx from './broadcast_backup_tx.js';
import transfer_send from './transfer_send.js';
import transfer_receive from './transfer_receive.js';

const greet = async () => {
  
  var esploraServer = "https://mempool.space/signet";

  const response = await axios.get(`${esploraServer}/api/blocks/tip/height`);

  console.log(response.data)

  console.log('Hello from the web lib!')
}

const createWallet = async (clientConfig, name) => {

  const wallet = await walletManager.createWallet(clientConfig, name);

  storageManager.setItem(name, wallet, false);
}

const newToken = async (clientConfig, walletName) => {
  const token = await deposit.getToken(clientConfig, walletName);
  return token;
}

const getDepositBitcoinAddress = async (clientConfig, walletName, amount) => {
  const address_info = await deposit.getDepositBitcoinAddress(clientConfig, walletName, amount);
  return address_info;
}

const listStatecoins = async (clientConfig, walletName) => {

  await coin_status.updateCoins(clientConfig, walletName);

  let wallet = storageManager.getItem(walletName);

  let coins = wallet.coins.map(coin => ({
      statechain_id: coin.statechain_id,
      amount: coin.amount,
      status: coin.status,
      adress: coin.address,
      locktime: coin.locktime
  }));

  return coins;
}

const withdrawCoin = async (clientConfig, walletName, statechainId, toAddress, feeRate) => {

  await coin_status.updateCoins(clientConfig, walletName);

  const txId = await withdraw.execute(clientConfig, walletName, statechainId, toAddress, feeRate);

  return txId;
}

const broadcastBackupTransaction = async (clientConfig, walletName, statechainId, toAddress, feeRate) => {

  await coin_status.updateCoins(clientConfig, walletName);

  let txIds = await broadcast_backup_tx.execute(clientConfig, walletName, statechainId, toAddress, feeRate);

  return txIds;
}

const newTransferAddress = async (walletName, options) => {

  const addr = await transfer_receive.newTransferAddress(walletName)
  let res = {transfer_receive: addr};

  if (options && options.generateBatchId) {
      const batchId = uuidv4();
      res.batch_id = batchId;
  }

  return res;
}

const transferSend = async (clientConfig, walletName, statechainId, toAddress, batchId) => {

  await coin_status.updateCoins(clientConfig, walletName);

  let coin = await transfer_send.execute(clientConfig, walletName, statechainId, toAddress, batchId);

  return coin;
}

const transferReceive = async (clientConfig, walletName) => {

  await coin_status.updateCoins(clientConfig, walletName);

  const received_statechain_ids = await transfer_receive.execute(clientConfig, walletName);

  return received_statechain_ids;
}

export default { 
  greet, 
  createWallet, 
  newToken, 
  getDepositBitcoinAddress, 
  listStatecoins,
  withdrawCoin,
  broadcastBackupTransaction,
  newTransferAddress,
  transferSend,
  transferReceive,
}
