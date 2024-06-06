import axios from 'axios';
import walletManager from './wallet.js';
import storageManager from './storage_manager.js';
import deposit from './deposit.js';
import coin_status from './coin_status.js';
import withdraw from './withdraw.js';

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

const withdrawCoin = async (clientConfig, walletName, statechainId, toAddress, fee_rate) => {
  await coin_status.updateCoins(clientConfig, walletName);

  const txId = await withdraw.execute(clientConfig, walletName, statechainId, toAddress, fee_rate);
  return txId;
}

export default { 
  greet, 
  createWallet, 
  newToken, 
  getDepositBitcoinAddress, 
  listStatecoins,
  withdrawCoin
}
