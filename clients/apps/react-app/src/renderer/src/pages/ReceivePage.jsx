import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import ReceiveStatecoinsPanel from "../components/ReceiveStatecoinsPanel";
import ReceiveStatecoinsInfoPanel from "../components/ReceiveStatecoinsInfoPanel";
import { useLoggedInWallet } from "../hooks/walletHooks";

const ReceivePage = () => {
  const navigate = useNavigate();
  const loggedInWallet = useLoggedInWallet();

  const onHelpButtonContainerClick = useCallback(() => {
    navigate("/helpandsupportpage");
  }, [navigate]);

  const onCogIconClick = useCallback(() => {
    navigate("/settingspage");
  }, [navigate]);

  const onLogoutButtonIconClick = useCallback(() => {
    navigate("/");
  }, [navigate]);



  return (
    <div className="w-full relative bg-whitesmoke h-[926px] overflow-hidden flex flex-col items-center justify-start gap-[26px]">
      <NavBar
        onHelpButtonContainerClick={onHelpButtonContainerClick}
        onCogIconClick={onCogIconClick}
        onLogoutButtonIconClick={onLogoutButtonIconClick}
        showLogoutButton
        showSettingsButton
        showHelpButton
      />
      <div className="self-stretch h-[121px] flex flex-col items-start justify-start py-0 px-5 box-border">
        <ReceiveStatecoinsPanel wallet={loggedInWallet} />
      </div>
      <div className="self-stretch flex-1 overflow-hidden flex flex-col items-center justify-start p-5">
        <ReceiveStatecoinsInfoPanel wallet={loggedInWallet} />
      </div>
    </div>
  );
};

export default ReceivePage;
