import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import HelpSupportHeaderPanel from "../components/HelpSupportHeaderPanel";
import HelpInfoPanel from "../components/HelpInfoPanel";

const HelpAndSupportPage = () => {
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
    <div className="w-full relative bg-whitesmoke h-[926px] flex flex-col items-center justify-start gap-[17px]">
      <NavBar
        onHelpButtonContainerClick={onHelpButtonContainerClick}
        onCogIconClick={onCogIconClick}
        onLogoutButtonIconClick={onLogoutButtonIconClick}
        showLogoutButton
        showSettingsButton
        showHelpButton
      />
      <div className="self-stretch h-[137px] flex flex-col items-start justify-start p-2.5 box-border">
        <HelpSupportHeaderPanel />
      </div>
      <div className="self-stretch flex-1 shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] overflow-hidden flex flex-col items-center justify-start py-5 px-2.5">
        <HelpInfoPanel />
      </div>
    </div>
  );
};

export default HelpAndSupportPage;
