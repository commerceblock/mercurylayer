import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import mercuryweblib from 'mercuryweblib';
import clientConfig from './ClientConfig';

function App() {
  const [count, setCount] = useState(0)
  const [inputWallet, setInputWallet] = useState('');
  const [inputAmount, setInputAmount] = useState('1000');
  const [inputStatechainId, setInputStatechainId] = useState('');
  const [inputToAddress, setInputToAddress] = useState('');

  const createWallet = async () => {
    if (inputWallet === '') {
      console.log('Please enter a wallet name');
      return;
    }

    await mercuryweblib.createWallet(clientConfig, inputWallet);
    console.log(`wallet ${inputWallet} created`);

    setInputWallet('');
  };

  const newToken = async () => {
    if (inputWallet === '') {
      console.log('Please enter a wallet name');
      return;
    }

    await mercuryweblib.newToken(clientConfig, inputWallet);
    console.log(`token created in the wallet ${inputWallet}` );

    setInputWallet('');
  };

  const getDepositBitcoinAddress = async () => {
    if (inputWallet === '') {
      console.log('Please enter a wallet name');
      return;
    }

    if (inputAmount === '') {
      console.log('Please enter an amount');
      return;
    }

    const parsedAmount = parseInt(inputAmount, 10);

    if (isNaN(parsedAmount)) {
      console.error(`Error: Unable to convert "${inputAmount}" to an integer.`);
    }

    let btcAddr = await mercuryweblib.getDepositBitcoinAddress(clientConfig, inputWallet, parsedAmount);
    console.log(`Address from wallet ${inputWallet}`);
    console.log(btcAddr);

    setInputWallet('');
  };

  const listStatecoins = async () => {
    if (inputWallet === '') {
      console.log('Please enter a wallet name');
      return;
    }

    const coins = await mercuryweblib.listStatecoins(clientConfig, inputWallet);

    console.log(`Coins from wallet ${inputWallet}`);
    console.log(coins);

    setInputWallet('');
  };

  const withdrawCoin = async () => {
    if (inputWallet === '') {
      console.log('Please enter a wallet name');
      return;
    }

    if (inputStatechainId === '') {
      console.log('Please enter a statechain id');
      return;
    }

    if (inputToAddress === '') {
      console.log('Please enter a recipient address');
      return;
    }

    const txid = await mercuryweblib.withdrawCoin(clientConfig, inputWallet, inputStatechainId, inputToAddress, null);

    console.log(`Withdraw txid: ${txid}`);

    setInputWallet('');
    setInputStatechainId('');
    setInputToAddress('');
  };

  const broadcastBackupTransaction = async () => {

    if (inputWallet === '') {
      console.log('Please enter a wallet name');
      return;
    }

    if (inputStatechainId === '') {
      console.log('Please enter a statechain id');
      return;
    }

    if (inputToAddress === '') {
      console.log('Please enter a recipient address');
      return;
    }

    const txids = await mercuryweblib.broadcastBackupTransaction(clientConfig, inputWallet, inputStatechainId, inputToAddress, null);

    console.log("Txids:");
    console.log(txids);

    setInputWallet('');
    setInputStatechainId('');
    setInputToAddress('');
  };

  const newTransferAddress = async () => {
    if (inputWallet === '') {
      console.log('Please enter a wallet name');
      return;
    }

    const transferAddress = await mercuryweblib.newTransferAddress(inputWallet, null);

    console.log(`Transfer address from wallet ${inputWallet}`);
    console.log(transferAddress);

    setInputWallet('');
  };

  const transferSend = async () => {

    if (inputWallet === '') {
      console.log('Please enter a wallet name');
      return;
    }

    if (inputStatechainId === '') {
      console.log('Please enter a statechain id');
      return;
    }

    if (inputToAddress === '') {
      console.log('Please enter a recipient address');
      return;
    }

    const coin = await mercuryweblib.transferSend(clientConfig, inputWallet, inputStatechainId, inputToAddress, null);
    console.log("Coin:");
    console.log(coin);

    setInputWallet('');
    setInputStatechainId('');
    setInputToAddress('');
  };

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>

      <div className="card">
        <input
          type="text"
          value={inputWallet}
          onChange={(e) => setInputWallet(e.target.value)}
          placeholder="Enter wallet name"
          style={{ marginRight: '10px' }}
        />

        <input
          type="text"
          value={inputAmount}
          onChange={(e) => setInputAmount(e.target.value)}
          placeholder="Enter amount"
          style={{ marginRight: '10px' }}
        />

        <input
          type="text"
          value={inputStatechainId}
          onChange={(e) => setInputStatechainId(e.target.value)}
          placeholder="Enter statechain id"
          style={{ marginRight: '10px' }}
        />

        <input
          type="text"
          value={inputToAddress}
          onChange={(e) => setInputToAddress(e.target.value)}
          placeholder="Enter recipient address"
          style={{ marginRight: '10px' }}
        />

      </div>

      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <button onClick={() => createWallet()}>
          Create Wallet
        </button>
        <button onClick={() => newToken()}>
          New Token
        </button>
        <button onClick={() => getDepositBitcoinAddress()}>
          New Deposit Address
        </button>
        <button onClick={() => listStatecoins()}>
          List Statecoins
        </button>
        <button onClick={() => withdrawCoin()}>
          Withdraw
        </button>
        <button onClick={() => broadcastBackupTransaction()}>
          Broadcast Backup Transaction
        </button>
        <br  />
        <button onClick={() => newTransferAddress()} style={{ marginTop: '10px' }}>
          New Transfer Address
        </button>
        <button onClick={() => transferSend()} style={{ marginTop: '10px' }}>
          Transfer Send
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
