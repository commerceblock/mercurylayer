import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import DepositBTCContainer from "../components/DepositBTCContainer";
import DepositPositionDeposit2 from "../components/DepositPositionDeposit2";

const DepositPageStep1 = () => {
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
    navigate("/mainpage");
  }, [navigate]);

  const onContinueButtonClick = useCallback(() => {
    navigate("/depositpage-step-2");
  }, [navigate]);

  return (
    <div className="w-full relative bg-whitesmoke h-[926px] flex flex-col items-center justify-start gap-[33px] text-left text-xs text-black font-body">
      <NavBar
        onHelpButtonContainerClick={onHelpButtonContainerClick}
        onCogIconClick={onCogIconClick}
        onLogoutButtonIconClick={onLogoutButtonIconClick}
      />
      <DepositBTCContainer
        onBackButtonContainerClick={onBackButtonContainerClick}
      />
      <div className="self-stretch flex-1 flex flex-row items-center justify-between p-2.5">
        <div className="self-stretch flex-1 rounded-8xs overflow-hidden flex flex-col items-start justify-between py-[21px] px-3.5">
          <DepositPositionDeposit2 />
        </div>
      </div>
      <div className="self-stretch h-[448px] flex flex-col items-center justify-center p-2.5 box-border">
        <div className="self-stretch flex-1 flex flex-row items-center justify-center">
          <div className="self-stretch flex-1 shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] flex flex-col items-center justify-center">
            <div className="self-stretch flex-1 rounded-t-sm rounded-b-none bg-white overflow-hidden flex flex-col items-center justify-center py-[26px] px-[46px] gap-[13px]">
              <div className="relative">
                f530e640-3dbf-4740-8add-16ed38d86926
              </div>
              <div className="relative text-darkgray-100">
                f530e640-3dbf-4740-8add-16ed38d86926
              </div>
            </div>
            <div className="self-stretch flex-1 bg-white flex flex-col items-center justify-center py-[41px] px-[157px] gap-[10px] border-t-[1px] border-solid border-darkgray-300 border-b-[1px]">
              <div className="relative">QR.Code</div>
              <div className="w-[94px] relative bg-tertiary box-border h-[90px] border-[3px] border-solid border-primary">
                <img
                  className="absolute h-full w-full top-[0px] right-[0px] bottom-[0px] left-[0px] max-w-full overflow-hidden max-h-full object-contain"
                  alt=""
                />
                <img
                  className="absolute h-full w-full top-[0px] right-[0px] bottom-[0px] left-[0px] max-w-full overflow-hidden max-h-full object-contain"
                  alt=""
                />
              </div>
            </div>
            <div className="self-stretch flex-1 rounded-t-none rounded-b-sm bg-white overflow-hidden flex flex-col items-center justify-center py-[39px] px-[33px] gap-[9px]">
              <div className="relative">Status</div>
              <div className="relative">Amount</div>
            </div>
          </div>
        </div>
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

export default DepositPageStep1;
