import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import SendStatecoinsPanel from "../components/SendStatecoinsPanel";
import SendSelectStateCoinPanel from "../components/SendSelectStateCoinPanel";
import SendTransactionDetailsPanel from "../components/SendTransactionDetailsPanel";
import { useLoggedInWallet } from "../hooks/walletHooks";

const SendPage = () => {
  const navigate = useNavigate();
  const loggedInWallet = useLoggedInWallet();
  const [selectedCoin, setSelectedCoin] = useState(null);

  const onHelpButtonContainerClick = useCallback(() => {
    navigate("/helpandsupportpage");
  }, [navigate]);

  const onCogIconClick = useCallback(() => {
    navigate("/settingspage");
  }, [navigate]);

  const onLogoutButtonIconClick = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handleCoinSelection = (coin) => {
    console.log('Selected coin was:', coin);
    setSelectedCoin(coin); // Set selected coin in state
  };

  return (
    <div className="w-full relative bg-whitesmoke-100 h-[926px] overflow-hidden flex flex-col items-center justify-start gap-[25px]">
      <NavBar
        onHelpButtonContainerClick={onHelpButtonContainerClick}
        onCogIconClick={onCogIconClick}
        onLogoutButtonIconClick={onLogoutButtonIconClick}
        showLogoutButton
        showSettingsButton
        showHelpButton
      />
      <div className="self-stretch h-[119px] flex flex-col items-start justify-start py-0 px-5 box-border">
        <SendStatecoinsPanel wallet={loggedInWallet} />
      </div>
      <div className="self-stretch flex-1 overflow-hidden flex flex-row flex-wrap items-start justify-start p-5 gap-[10px]">
        <SendSelectStateCoinPanel wallet={loggedInWallet} selectedCoin={selectedCoin} onSelectCoin={handleCoinSelection} />
        <SendTransactionDetailsPanel wallet={loggedInWallet} selectedCoin={selectedCoin} />
      </div>
    </div>
  );
};

export default SendPage;
