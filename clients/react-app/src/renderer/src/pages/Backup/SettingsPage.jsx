import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import SettingsHeaderContainer from "../components/SettingsHeaderContainer";
import NavBar from "../components/NavBar";
import ConnectivitySettingsForm from "../components/ConnectivitySettingsForm";

const SettingsPage = () => {
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
    <div className="relative bg-whitesmoke w-full h-[926px] text-left text-base text-black font-body">
      <SettingsHeaderContainer />
      <NavBar
        propCursor="unset"
        onHelpButtonContainerClick={onHelpButtonContainerClick}
        onCogIconClick={onCogIconClick}
        onLogoutButtonIconClick={onLogoutButtonIconClick}
        loggedIn
      />
      <div className="absolute w-[calc(100%_-_50px)] top-[232px] right-[24px] left-[26px] h-[670px] flex flex-row items-start justify-start">
        <ConnectivitySettingsForm />
        <div className="self-stretch flex-1 bg-white overflow-hidden flex flex-col items-start justify-start p-2.5">
          <div className="relative tracking-[-0.02em] leading-[22px]">
            Date/Time Format
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
