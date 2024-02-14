import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import DepositHeaderPanel from "../components/DepositHeaderPanel";
import TokenInfoCard from "../components/TokenInfoCard";

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
    navigate("/depositpage2");
  }, [navigate]);

  return (
    <div className="w-full relative bg-whitesmoke h-[926px] flex flex-col items-center justify-start gap-[33px] text-left text-sm text-white font-body-small">
      <NavBar
        onHelpButtonContainerClick={onHelpButtonContainerClick}
        onCogIconClick={onCogIconClick}
        onLogoutButtonIconClick={onLogoutButtonIconClick}
        showHelpButton
        showSettingsButton
        showLogoutButtonIcon
      />
      <div className="self-stretch h-[121px] flex flex-col items-center justify-start py-0 px-2.5 box-border">
        <DepositHeaderPanel
          onBackButtonContainerClick={onBackButtonContainerClick}
        />
      </div>
      <div className="self-stretch flex-1 flex flex-row items-center justify-between p-2.5">
        <div className="self-stretch flex-1 relative">
          <div className="absolute h-full w-[27.55%] top-[0%] right-[0%] bottom-[0%] left-[72.45%] flex flex-row items-center justify-center gap-[7px]">
            <div className="w-[22px] h-[22px] flex flex-row items-center justify-center relative gap-[10px]">
              <div className="self-stretch flex-1 relative rounded-[50%] bg-gray-500 z-[0]" />
              <div className="w-[9px] absolute my-0 mx-[!important] top-[calc(50%_-_9px)] left-[calc(50%_-_4px)] font-extralight inline-block z-[1]">
                3
              </div>
            </div>
            <div className="w-[76px] relative h-[17px] text-gray-500">
              <div className="absolute top-[0px] left-[0px] font-extralight">
                BTC Details
              </div>
            </div>
          </div>
          <div className="absolute h-full w-[32.01%] top-[0%] right-[30.71%] bottom-[0%] left-[37.28%] flex flex-row items-center justify-center gap-[7px]">
            <div className="w-[22px] h-[22px] flex flex-row items-center justify-center relative gap-[10px]">
              <div className="self-stretch flex-1 relative rounded-[50%] bg-gray-500 z-[0]" />
              <div className="w-[9px] absolute my-0 mx-[!important] top-[calc(50%_-_9px)] left-[calc(50%_-_4px)] font-extralight inline-block z-[1]">
                2
              </div>
            </div>
            <div className="w-[104px] relative h-[17px] text-gray-500">
              <div className="absolute top-[0px] left-[0px] font-extralight">
                Choose Amount
              </div>
            </div>
          </div>
          <div className="absolute h-full w-[34.12%] top-[0%] right-[65.88%] bottom-[0%] left-[0%] flex flex-row items-center justify-center gap-[5px]">
            <div className="w-[22px] h-[22px] flex flex-row items-center justify-center relative gap-[10px]">
              <div className="self-stretch flex-1 relative rounded-[50%] bg-mediumslateblue-300 z-[0]" />
              <div className="w-1.5 absolute my-0 mx-[!important] top-[calc(50%_-_9px)] left-[calc(50%_-_3px)] font-extralight inline-block z-[1]">
                1
              </div>
            </div>
            <div className="w-[52px] relative h-[17px] text-gray-500">
              <div className="absolute top-[0%] left-[0%] font-extralight">
                Pay Fee
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="self-stretch h-[448px] overflow-y-auto shrink-0 flex flex-col items-center justify-start p-2.5 box-border">
        <TokenInfoCard />
      </div>
      <div className="self-stretch flex-1 overflow-hidden flex flex-col items-end justify-center p-2.5">
        <button
          className="cursor-pointer [border:none] p-0 bg-mediumslateblue-200 w-[90px] rounded-sm shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] h-[30px] overflow-hidden shrink-0 flex flex-row items-end justify-end"
          onClick={onContinueButtonClick}
        >
          <div className="self-stretch flex-1 relative text-3xs tracking-[-0.02em] leading-[22px] font-semibold font-body-small text-white text-center flex items-center justify-center">
            CONTINUE
          </div>
        </button>
      </div>
    </div>
  );
};

export default DepositPageStep1;
