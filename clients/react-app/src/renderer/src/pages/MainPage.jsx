import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import MainHeaderPanel from "../components/MainHeaderPanel";
import ConnectionsPanel from "../components/ConnectionsPanel";
import MainInfoPanel from "../components/MainInfoPanel";

const MainPage = () => {
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
    <div className="w-full relative bg-whitesmoke h-[926px] overflow-hidden flex flex-col items-center justify-start gap-[5px]">
      <NavBar
        onHelpButtonContainerClick={onHelpButtonContainerClick}
        onCogIconClick={onCogIconClick}
        onLogoutButtonIconClick={onLogoutButtonIconClick}
        showLogoutButton
        showSettingsButton
        showHelpButton
      />
      <div className="self-stretch overflow-hidden flex flex-row items-center justify-start p-2.5">
        <MainHeaderPanel />
      </div>
      <div className="self-stretch overflow-hidden flex flex-row items-center justify-center p-2.5">
        <ConnectionsPanel />
      </div>
      <div className="self-stretch flex-1 overflow-hidden flex flex-row items-center justify-start p-2.5">
        <MainInfoPanel />
      </div>
    </div>
  );
};

export default MainPage;
