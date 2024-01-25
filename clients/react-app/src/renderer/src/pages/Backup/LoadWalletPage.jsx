import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import LoadWalletContainer from "../components/LoadWalletContainer";
import NavBar from "../components/NavBar";
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
    <div className="relative bg-whitesmoke w-full h-[926px] overflow-hidden">
      <LoadWalletContainer walletLoaded={walletLoaded} />
      <NavBar
        propCursor="pointer"
        onNavNavMenuClick={onNavNavMenuClick}
        onHelpButtonContainerClick={onHelpButtonContainerClick}
        onCogIconClick={onCogIconClick}
        onLogoutButtonIconClick={onLogoutButtonIconClick}
        loggedIn
      />
    </div>
  );
};

export default LoadWalletPage;
