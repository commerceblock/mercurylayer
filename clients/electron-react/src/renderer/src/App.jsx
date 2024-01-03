

import { useDispatch } from 'react-redux'
import { walletActions } from './store/wallet'


import CreateWallet from './components/CreateWallet'
import { useEffect } from 'react'

import WalletPanel from './components/WalletPanel'


function App() {
  const dispatch = useDispatch();

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

  return (
    <div className="container">

      <CreateWallet />

        <WalletPanel />
      
    </div>
  )
}

export default App
