import init from "mercury-wasm";
import wasmUrl from "mercury-wasm/mercury_wasm_bg.wasm?url";

import { useDispatch, useSelector } from "react-redux";
import { walletActions } from "./store/wallet";
import transferReceive from "./logic/transferReceive";
import coinStatus from "./logic/coinStatus";

import { useEffect, useState, useRef } from "react";
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
import { useLoggedInWallet } from "./hooks/walletHooks";
import { encryptedWalletActions } from "./store/encryptedWallets";
import walletManager from "./logic/walletManager";

const App = () => {
  const dispatch = useDispatch();
  const loggedInWallet = useLoggedInWallet();
  const [areWalletsLoaded, setAreWalletLoaded] = useState(false);
  const wallets = useSelector((state) => state.wallet.wallets);
  const password = useSelector((state) => state.wallet.password);
  const backupTxs = useSelector((state) => state.wallet.backupTxs);
  const isUpdatingCoins = useRef(false);

  const action = useNavigationType();
  const location = useLocation();
  const pathname = location.pathname;

  useEffect(() => {
    const loadWasm = async () => {
      await init(wasmUrl);
    };

    const fetchEncryptedWallets = async () => {
      const wallets = await window.api.getEncryptedWallets(); // gets the sqlite3 data
      console.log("sqlite3 wallets data:", wallets);
      await dispatch(encryptedWalletActions.loadWallets(wallets)); // populates the sqlite3 data into redux

      setAreWalletLoaded(true);
    };

    const fetchBackupTxs = async () => {
      const backupTxs = await window.api.getAllBackupTxs(); // gets the sqlite3 data
      await dispatch(walletActions.loadBackupTxs(backupTxs)); // populates the sqlite3 data into redux
    };

    loadWasm();
    fetchBackupTxs();
    fetchEncryptedWallets();
  }, [dispatch]);

  useEffect(() => {
    if (wallets && wallets.length > 0 && areWalletsLoaded) {
      console.log("wallet object thats going to get encrypted -> ", wallets[0]);
      let encryptedData = walletManager.encryptString(
        JSON.stringify(wallets[0]),
        password
      );

      window.api.syncEncryptedWallets({
        name: wallets[0].name,
        wallet_json: encryptedData,
      }); // saves wallets with encryption into database
    }

    const executeFunction = async () => {
      if (isUpdatingCoins.current) return;
      isUpdatingCoins.current = true;
      // Here, wallets will always reflect the latest state
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
    }, 3000);

    // Clean up the interval on component unmount or wallets change
    return () => clearInterval(interval);
  }, [wallets, password]);

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
  }, [pathname, loggedInWallet]);

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
      <Route path="/new-wallet-0" element={<WalletWizardPage />} />
      <Route path="/new-wallet-1" element={<WalletWizardPage1 />} />
      <Route path="/new-wallet-2" element={<WalletWizardPage2 />} />
      <Route path="/new-wallet-3" element={<WalletWizardPage3 />} />
      <Route path="/mainpage" element={<MainPage />} />
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
};
export default App;
