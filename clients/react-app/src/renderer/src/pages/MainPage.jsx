import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import MainHeaderPanel from "../components/MainHeaderPanel";
import ConnectionsPanel from "../components/ConnectionsPanel";
import MainInfoPanel from "../components/MainInfoPanel";
import { useLoggedInWallet } from "../hooks/walletHooks";

const MainPage = () => {

  const loggedInWallet = useLoggedInWallet();

  const navigate = useNavigate();

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
    <div className="w-full relative bg-whitesmoke overflow-hidden flex flex-col items-center justify-start gap-[5px]">
      <NavBar
        onHelpButtonContainerClick={onHelpButtonContainerClick}
        onCogIconClick={onCogIconClick}
        onLogoutButtonIconClick={onLogoutButtonIconClick}
        showLogoutButton
        showSettingsButton
        showHelpButton
      />
      <div className="self-stretch overflow-hidden flex flex-row items-center justify-start p-2.5">
        <MainHeaderPanel wallet={loggedInWallet} />
      </div>

      {
        /*
        Disabled until UI is complete
        <div className="self-stretch overflow-hidden flex flex-row items-center justify-center p-2.5">
          <ConnectionsPanel />
        </div>
        */
      }

      <div className="self-stretch flex-1 overflow-hidden flex flex-row items-center justify-start p-2.5">
        <MainInfoPanel coins={loggedInWallet.coins} activities={loggedInWallet.activities} />
      </div>
    </div>
  );
};

export default MainPage;
