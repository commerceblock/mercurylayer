import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import HelpSupportHeaderContainer from "../components/HelpSupportHeaderContainer";
import NavBar from "../components/NavBar";

const HelpAndSupportPage = () => {
  const navigate = useNavigate();

  const onSeed8ContainerClick = useCallback(() => {
    navigate("/mainpage");
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

  return (
    <div className="relative bg-whitesmoke w-full h-[926px]">
      <HelpSupportHeaderContainer
        topContainerHelpSupportWidth="calc(100% - 48px)"
        topContainerHelpSupportPosition="absolute"
        topContainerHelpSupportTop="90px"
        topContainerHelpSupportRight="24px"
        topContainerHelpSupportLeft="24px"
        topContainerHelpSupportHeight="117px"
        topContainerTitleHeight="unset"
        topContainerTitlePadding="10px"
        topContainerTitleFlex="1"
        topContainerTitleHeight1="unset"
        topContainerTitleFlex1="1"
        onSeed8ContainerClick={onSeed8ContainerClick}
      />
      <NavBar
        propCursor="unset"
        onHelpButtonContainerClick={onHelpButtonContainerClick}
        onCogIconClick={onCogIconClick}
        onLogoutButtonIconClick={onLogoutButtonIconClick}
        loggedIn
      />
    </div>
  );
};

export default HelpAndSupportPage;
