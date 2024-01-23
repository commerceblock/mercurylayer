import { useEffect } from "react";

import init from 'mercury-wasm';
import wasmUrl from 'mercury-wasm/mercury_wasm_bg.wasm?url'

import {
  Routes,
  Route,
  useNavigationType,
  useLocation,
} from "react-router-dom";
import WelcomePage from "./pages/WelcomePage";

import DepositPageStep1 from "./pages/DepositPageStep1";
import DepositPageStep2 from "./pages/DepositPageStep2";
import DepositPageStep3 from "./pages/DepositPageStep3";

import LoadWalletPage from "./pages/LoadWalletPage";
import RecoverWalletFromSeedPage from "./pages/RecoverWalletFromSeedPage";
import RecoverWalletFromBackupPage from "./pages/RecoverWalletFromBackupPage";
import NewWalletPage from "./pages/NewWalletPage";
import WalletDetailsPage from "./pages/WalletDetailsPage";
import SeedPage from "./pages/SeedPage";
import ConfirmSeedPage from "./pages/ConfirmSeedPage";
import MainPage from "./pages/MainPage";
import HelpAndSupportPage from "./pages/HelpAndSupportPage";
import SettingsPage from "./pages/SettingsPage";
import WithdrawPage from "./pages/WithdrawPage";
import ReceivePage from "./pages/ReceivePage";
import SendPage from "./pages/SendPage";

function App() {
  const action = useNavigationType();
  const location = useLocation();
  const pathname = location.pathname;

  useEffect(() => {
    const loadWasm = async () => {
      await init(wasmUrl);
    };

    loadWasm();
  }, [])

  useEffect(() => {
    if (action !== "POP") {
      window.scrollTo(0, 0);
    }
  }, [action, pathname]);

  useEffect(() => {
    let title = "";
    let metaDescription = "";

    switch (pathname) {
      case "/":
        title = "";
        metaDescription = "";
        break;
      case "/depositpage-step-2":
        title = "";
        metaDescription = "";
        break;
      case "/depositpage-step-3":
        title = "";
        metaDescription = "";
        break;
      case "/depositpage-step-1":
        title = "";
        metaDescription = "";
        break;
      case "/loadwalletpage":
        title = "";
        metaDescription = "";
        break;
      case "/recoverwalletfromseedpage":
        title = "";
        metaDescription = "";
        break;
      case "/recoverwalletfrombackuppage":
        title = "";
        metaDescription = "";
        break;
      case "/newwalletpage":
        title = "";
        metaDescription = "";
        break;
      case "/new-wallet-2-create-password":
        title = "";
        metaDescription = "";
        break;
      case "/new-wallet-3-wallet-seed":
        title = "";
        metaDescription = "";
        break;
      case "/new-wallet-4-finalize-seed":
        title = "";
        metaDescription = "";
        break;
      case "/mainpage":
        title = "";
        metaDescription = "";
        break;
      case "/helpandsupportpage":
        title = "";
        metaDescription = "";
        break;
      case "/settingspage":
        title = "";
        metaDescription = "";
        break;
      case "/withdrawpage":
        title = "";
        metaDescription = "";
        break;
      case "/receivepage":
        title = "";
        metaDescription = "";
        break;
      case "/sendpage":
        title = "";
        metaDescription = "";
        break;
    }

    if (title) {
      document.title = title;
    }

    if (metaDescription) {
      const metaDescriptionTag = document.querySelector(
        'head > meta[name="description"]'
      );
      if (metaDescriptionTag) {
        metaDescriptionTag.content = metaDescription;
      }
    }
  }, [pathname]);

  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/depositpage-step-2" element={<DepositPageStep2 />} />
      <Route path="/depositpage-step-3" element={<DepositPageStep3 />} />
      <Route path="/depositpage-step-1" element={<DepositPageStep1 />} />
      <Route path="/loadwalletpage" element={<LoadWalletPage />} />
      <Route
        path="/recoverwalletfromseedpage"
        element={<RecoverWalletFromSeedPage />}
      />
      <Route
        path="/recoverwalletfrombackuppage"
        element={<RecoverWalletFromBackupPage />}
      />
      <Route path="/newwalletpage" element={<NewWalletPage />} />
      <Route
        path="/new-wallet-2-create-password"
        element={<WalletDetailsPage />}
      />
      <Route path="/new-wallet-3-wallet-seed" element={<SeedPage />} />
      <Route path="/new-wallet-4-finalize-seed" element={<ConfirmSeedPage />} />
      <Route path="/mainpage" element={<MainPage />} />
      <Route path="/helpandsupportpage" element={<HelpAndSupportPage />} />
      <Route path="/settingspage" element={<SettingsPage />} />
      <Route path="/withdrawpage" element={<WithdrawPage />} />
      <Route path="/receivepage" element={<ReceivePage />} />
      <Route path="/sendpage" element={<SendPage />} />
    </Routes>
  );
}
export default App;
