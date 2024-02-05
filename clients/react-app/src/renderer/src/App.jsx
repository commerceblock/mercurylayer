import init from 'mercury-wasm';
import wasmUrl from 'mercury-wasm/mercury_wasm_bg.wasm?url'
import { useDispatch, useSelector } from 'react-redux'
import { walletActions } from './store/wallet';

import { useEffect, useState, useRef } from 'react'
import {
  Routes,
  Route,
  useNavigationType,
  useLocation,
} from "react-router-dom";
import WelcomePage from "./pages/WelcomePage";
import LoadWalletPage from "./pages/LoadWalletPage";
import RecoverWalletFromSeedPage from "./pages/RecoverWalletFromSeedPage";
import RecoverWalletFromBackupPage from "./pages/RecoverWalletFromBackupPage";
import WalletWizardPage from "./pages/WalletWizardPage";
import WalletWizardPage1 from "./pages/WalletWizardPage1";
import WalletWizardPage2 from "./pages/WalletWizardPage2";
import WalletWizardPage3 from "./pages/WalletWizardPage3";
import MainPage from "./pages/MainPage";
import SettingsPage from "./pages/SettingsPage";
import HelpAndSupportPage from "./pages/HelpAndSupportPage";
import DepositPage from "./pages/DepositPage";
import DepositPage1 from "./pages/DepositPage1";
import DepositPage2 from "./pages/DepositPage2";
import WithdrawPage from "./pages/WithdrawPage";
import ReceivePage from "./pages/ReceivePage";
import SendPage from "./pages/SendPage";
import { useLoggedInWallet } from './hooks/walletHooks';

function App() {
  const dispatch = useDispatch();
  const loggedInWallet = useLoggedInWallet();
  const [areWalletsLoaded, setAreWalletLoaded] = useState(false);
  const wallets = useSelector(state => state.wallet.wallets);
  const backupTxs = useSelector(state => state.wallet.backupTxs);
  const isUpdatingCoins = useRef(false);

  const action = useNavigationType();
  const location = useLocation();
  const pathname = location.pathname;

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

  }, [dispatch]);

  useEffect(() => {
    if (wallets && wallets.length > 0 && areWalletsLoaded) {
      console.log("Syncing wallets");
      window.api.syncWallets(wallets);
    }

    /*
    const executeFunction = async () => {

      if (isUpdatingCoins.current) return;

      isUpdatingCoins.current = true;
      // Here, wallets will always reflect the latest state
      console.log("UpdatingCoins");
      let coinsUpdated = await transferReceive.execute(wallets);
      // console.log("coinsUpdated", coinsUpdated);
      await dispatch(walletActions.transferReceive({ coinsUpdated }));

      let updatedStatus = await coinStatus.updateCoins(wallets);

      await dispatch(walletActions.coinStatus(updatedStatus));

      isUpdatingCoins.current = false;
    };

    // Set up the interval
    const interval = setInterval(() => {
      executeFunction();
    }, 5000);

    // Clean up the interval on component unmount or wallets change
    return () => clearInterval(interval);*/
  }, [wallets]);

  useEffect(() => {
    if (backupTxs && backupTxs.length > 0 && areWalletsLoaded) {
      window.api.syncBackupTxs(backupTxs);
    }
  }, [backupTxs]);

  useEffect(() => {
    if (action !== "POP") {
      window.scrollTo(0, 0);
    }
  }, [action, pathname]);

  useEffect(() => {
    let title = "Mercury Wallet";

    if (loggedInWallet) {
      title = "Mercury Wallet - " + loggedInWallet.name;
    }

    if (title) {
      document.title = title;
    }

  }, [pathname]);

  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/loadwalletpage" element={<LoadWalletPage />} />
      <Route
        path="/recoverwalletfromseedpage"
        element={<RecoverWalletFromSeedPage />}
      />
      <Route
        path="/recoverwalletfrombackuppage"
        element={<RecoverWalletFromBackupPage />}
      />
      <Route
        path="/new-wallet-0"
        element={<WalletWizardPage />} />
      <Route
        path="/new-wallet-1"
        element={<WalletWizardPage1 />}
      />
      <Route
        path="/new-wallet-2"
        element={<WalletWizardPage2 />}
      />
      <Route
        path="/new-wallet-3"
        element={<WalletWizardPage3 />}
      />
      <Route path="/wallet-main-1" element={<MainPage />} />
      <Route path="/settingspage" element={<SettingsPage />} />
      <Route path="/helpandsupportpage" element={<HelpAndSupportPage />} />
      <Route path="/depositpage0" element={<DepositPage />} />
      <Route path="/depositpage1" element={<DepositPage1 />} />
      <Route path="/depositpage2" element={<DepositPage2 />} />
      <Route path="/withdrawpage" element={<WithdrawPage />} />
      <Route path="/receivepage" element={<ReceivePage />} />
      <Route path="/sendpage" element={<SendPage />} />
    </Routes>
  );
}
export default App;
