import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ReceiveStatecoinsContainer from "../components/ReceiveStatecoinsContainer";
import NavBar from "../components/NavBar";

const ReceivePage = () => {
  const navigate = useNavigate();

  const onBackComponentContainerClick = useCallback(() => {
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
    <div className="relative bg-whitesmoke w-full h-[926px] overflow-hidden">
      <ReceiveStatecoinsContainer
        transactionId="/arrowdown-1@2x.png"
        statecoinActionLabel="Receive Statecoins"
        statecoinAddressText="Use the address below to receive statecoins"
        onBackComponentContainerClick={onBackComponentContainerClick}
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

export default ReceivePage;
