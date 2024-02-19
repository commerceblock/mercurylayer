

import { useDispatch, useSelector } from 'react-redux'
import { walletActions } from './store/wallet'

import CreateWallet from './components/CreateWallet'
import WalletPage from './pages/WalletPage'
import  CoinPage from './pages/CoinPage'
import { useEffect, useState, useRef } from 'react'

import init from 'mercury-wasm';
import wasmUrl from 'mercury-wasm/mercury_wasm_bg.wasm?url'

import coinStatus from './logic/coinStatus';

import transferReceive from './logic/transferReceive'

import RootLayout from './pages/Root'

import {
  createBrowserRouter,
  RouterProvider
} from 'react-router-dom'


function App() {
  const dispatch = useDispatch();

  const [areWalletsLoaded, setAreWalletLoaded] = useState(false)

  const wallets = useSelector(state => state.wallet.wallets);

  const backupTxs = useSelector(state => state.wallet.backupTxs);

  const isUpdatingCoins = useRef(false);

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
      console.log("Syncing wallets");
      window.api.syncWallets(wallets);
    }

    const executeFunction = async () => {

      if (isUpdatingCoins.current) return;

      isUpdatingCoins.current = true;
      // Here, wallets will always reflect the latest state
      console.log("UpdatingCoins");
      let coinsUpdated = await transferReceive.execute(wallets);
      // console.log("coinsUpdated", coinsUpdated);
      await dispatch(walletActions.transferReceive({coinsUpdated}));

      let updatedStatus = await coinStatus.updateCoins(wallets);

      await dispatch(walletActions.coinStatus(updatedStatus));

      isUpdatingCoins.current = false;
    };

    // Set up the interval
    const interval = setInterval(() => {
      executeFunction();
    }, 5000);

    // Clean up the interval on component unmount or wallets change
    return () => clearInterval(interval);
  }, [wallets]);

  useEffect(() => {
    if (backupTxs && backupTxs.length > 0 && areWalletsLoaded) {
      window.api.syncBackupTxs(backupTxs);
    }
  }, [backupTxs]);

  const router = createBrowserRouter([
    { 
      path: '/', 
      element: <RootLayout />,
      children: [
        { path: '', element: <div></div> },
        { path: 'wallets/:walletName', element: <WalletPage /> },
        { path: 'wallets/:walletName/:coinUserPubkey', element: <CoinPage /> }
      ]
    }
  ])

  return <RouterProvider router={router} />;
}

export default App
