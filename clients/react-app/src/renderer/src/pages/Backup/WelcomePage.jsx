import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import WelcomeContainer from "../components/WelcomeContainer";
import NavBar from "../components/NavBar";

const WelcomePage = () => {
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
    <div className="relative bg-whitesmoke w-full h-[926px]">
      <WelcomeContainer />
      <NavBar
        onHelpButtonContainerClick={onHelpButtonContainerClick}
        onCogIconClick={onCogIconClick}
        onLogoutButtonIconClick={onLogoutButtonIconClick}
        loggedIn
      />
    </div>
  );
};

export default WelcomePage;
