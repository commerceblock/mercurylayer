import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import WalletLoadContainer from "../components/WalletLoadContainer";
import { useSelector } from "react-redux";

const LoadWalletPage = () => {
  const wallets = useSelector(state => state.wallet.wallets);

  const navigate = useNavigate();

  const onNavNavMenuClick = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const onHelpButtonContainerClick = useCallback(() => {
    navigate("/helpandsupportpage");
  }, [navigate]);

  const onCogIconClick = useCallback(() => {
    navigate("/settingspage");
  }, [navigate]);

  const onLogoutButtonIconClick = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const walletLoaded = wallets.length > 0; // Determine if wallets are present

  return (
    <div className="w-full relative bg-whitesmoke h-[926px] overflow-hidden flex flex-col items-center justify-start gap-[82px]">
      <NavBar
        onNavNavMenuClick={onNavNavMenuClick}
        onHelpButtonContainerClick={onHelpButtonContainerClick}
        onCogIconClick={onCogIconClick}
        onLogoutButtonIconClick={onLogoutButtonIconClick}
        showLogoutButton={false}
        showSettingsButton={false}
        showHelpButton={false}
      />
      <WalletLoadContainer walletLoaded={walletLoaded} />
    </div>
  );
};

export default LoadWalletPage;
