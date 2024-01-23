import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import DepositBTCContainer from "../components/DepositBTCContainer";
import DepositPositionDeposit from "../components/DepositPositionDeposit";
import StatecoinAmountWindow from "../components/StatecoinAmountWindow";

const DepositPageStep2 = () => {
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

  const onBackButtonContainerClick = useCallback(() => {
    navigate("/depositpage-step-1");
  }, [navigate]);

  const onContinueButtonClick = useCallback(() => {
    navigate("/depositpage-step-3");
  }, [navigate]);

  return (
    <div className="w-full relative bg-whitesmoke h-[926px] flex flex-col items-center justify-start gap-[33px]">
      <NavBar
        onHelpButtonContainerClick={onHelpButtonContainerClick}
        onCogIconClick={onCogIconClick}
        onLogoutButtonIconClick={onLogoutButtonIconClick}
      />
      <DepositBTCContainer
        onBackButtonContainerClick={onBackButtonContainerClick}
      />
      <div className="self-stretch flex-1 flex flex-row items-center justify-between p-2.5">
        <div className="self-stretch flex-1 rounded-8xs overflow-hidden flex flex-row items-center justify-between py-[21px] px-3.5">
          <DepositPositionDeposit />
        </div>
      </div>
      <div className="self-stretch h-[448px] overflow-hidden shrink-0 flex flex-col items-center justify-center p-2.5 box-border gap-[10px]">
        <StatecoinAmountWindow />
        <StatecoinAmountWindow />
      </div>
      <div className="self-stretch overflow-hidden flex flex-col items-end justify-center p-2.5">
        <button
          className="cursor-pointer [border:none] p-0 bg-mediumslateblue-200 w-[90px] rounded-sm shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] h-[30px] overflow-hidden shrink-0 flex flex-row items-end justify-end"
          onClick={onContinueButtonClick}
        >
          <div className="self-stretch flex-1 relative text-3xs tracking-[-0.02em] leading-[22px] font-semibold font-body text-white text-center flex items-center justify-center">
            CONTINUE
          </div>
        </button>
      </div>
    </div>
  );
};

export default DepositPageStep2;
