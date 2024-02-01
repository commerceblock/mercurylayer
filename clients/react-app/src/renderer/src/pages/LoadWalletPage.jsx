import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import WalletLoadContainer from "../components/WalletLoadContainer";
import { useDispatch, useSelector } from "react-redux";
import { walletActions } from "../store/wallet";

const LoadWalletPage = () => {
  const wallets = useSelector(state => state.wallet.wallets);
  const dispatch = useDispatch();
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

  const onOpenButtonClick = async (selectedWallet) => {
    console.log('wallet loaded was:', selectedWallet);
    // set it in the state
    await dispatch(walletActions.selectWallet(selectedWallet));

    navigate("/wallet-main-1");
  };

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
      <WalletLoadContainer wallets={wallets} walletLoaded={walletLoaded} onOpenButtonClick={onOpenButtonClick} />
    </div>
  );
};

export default LoadWalletPage;
