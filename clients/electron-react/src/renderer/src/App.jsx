

import { useDispatch } from 'react-redux'
import { walletActions } from './store/wallet'

import Wallet from './components/Wallet'
import { useState, useEffect } from 'react'


function App() {
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [isWalletCreated, setIsWalletCreated] = useState(false);
  

  useEffect(() => {
    async function fetchWallets() {
      const wallets = await window.api.getWallets();

      dispatch(walletActions.loadWallets(wallets));
      if (wallets.length > 0) {
        setIsWalletCreated(true);
      }
    }
    fetchWallets();
  }, []);

  const dispatch = useDispatch();

  const getToken = async () => {
    let token = await window.api.getToken();
    console.log(token);
  };

  const getDepositAddressInfo = async () => {
    let payout = {
      walletName: "w_test",
      amount: 10000
    };
    let depositAddressInfo = await window.api.getDepositAddressInfo(payout);
    console.log(depositAddressInfo);
    dispatch(walletActions.addOrUpdateWallet(depositAddressInfo.wallet));
    
  };

  const createWallet = async () => {
    setIsCreatingWallet(true);
    let wallet = await window.api.createWallet("w_test");
    console.log(wallet);
    // add wallet to redux store
    dispatch(walletActions.addOrUpdateWallet(wallet));
    setIsWalletCreated(true);
  };

  return (
    <div className="container">

      <div className="features">
        
        <div className="feature-item">
          <article>
            <h2 className="title">Mercury Layer</h2>
            <p className="detail">
              Statechain is a layer 2 solution for Bitcoin. 
            </p>
            {(!isCreatingWallet && !isWalletCreated ) && <button onClick={createWallet}>Create Wallet</button>}
            {isWalletCreated && <button onClick={getDepositAddressInfo}>New Deposit Address</button>}
          </article>
        </div>

        <Wallet></Wallet>

      </div>
      
    </div>
  )
}

export default App
