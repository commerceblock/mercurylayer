

import { useDispatch, useSelector } from 'react-redux'
import { walletActions } from './store/wallet'


import CreateWallet from './components/CreateWallet'
import WalletList from './components/WalletList'
import { useEffect, useState } from 'react'


import init from 'mercury-wasm';
import wasmUrl from 'mercury-wasm/mercury_wasm_bg.wasm?url'

function App() {
  const dispatch = useDispatch();

  const [areWalletsLoaded, setAreWalletLoaded] = useState(false)

  const wallets = useSelector(state => state.wallet.wallets);

  const backupTxs = useSelector(state => state.wallet.backupTxs);

  useEffect(() => {

    const loadWasm = async () => {
      await init(wasmUrl);
    };

    async function fetchWallets() {
      const wallets = await window.api.getWallets();

      await dispatch(walletActions.loadWallets(wallets));
      
      const backupTxs = await window.api.getAllBackupTxs();

      await dispatch(walletActions.loadBackupTxs(backupTxs));

      setAreWalletLoaded(true);
    }

    loadWasm();
    fetchWallets();
    
  }, []);

  useEffect(() => {
    if (wallets && wallets.length > 0 && areWalletsLoaded) {
      window.api.syncWallets(wallets);
    }
  }, [wallets]);

  useEffect(() => {
    if (backupTxs && backupTxs.length > 0 && areWalletsLoaded) {
      window.api.syncBackupTxs(backupTxs);
    }
  }, [backupTxs]);

  return (
    <div className="container">

      <CreateWallet />
      <WalletList style={{marginTop: 10}} />

    </div>
  )
}

export default App
