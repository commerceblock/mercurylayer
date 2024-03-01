import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import WithdrawHeaderContainer from "../components/WithdrawHeaderContainer";
import NavBar from "../components/NavBar";

const WithdrawPage = () => {
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
      <WithdrawHeaderContainer />
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

export default WithdrawPage;
