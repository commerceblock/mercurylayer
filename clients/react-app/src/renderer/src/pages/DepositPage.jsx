import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DepositSteppers from "../components/DepositSteppers";
import DepositBTCHeaderContainer from "../components/DepositBTCHeaderContainer";
import NavBar from "../components/NavBar";

const DepositPage = () => {
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
      <div className="absolute w-[calc(100%_-_48px)] top-[854px] right-[24px] left-[24px] h-[30px] overflow-hidden">
        <button className="cursor-pointer [border:none] p-0 bg-mediumslateblue-200 absolute top-[0px] right-[0px] rounded-sm shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] w-[90px] h-[30px] overflow-hidden flex flex-row items-end justify-end">
          <div className="self-stretch flex-1 relative text-3xs tracking-[-0.02em] leading-[22px] font-semibold font-body text-white text-center flex items-center justify-center">
            CONTINUE
          </div>
        </button>
      </div>
      <div className="absolute w-[calc(100%_-_46px)] top-[247px] right-[23px] left-[23px] h-[22px] overflow-hidden">
        <DepositSteppers />
      </div>
      <DepositBTCHeaderContainer />
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

export default DepositPage;
