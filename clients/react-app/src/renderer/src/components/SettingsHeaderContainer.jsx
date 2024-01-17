import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

const SettingsHeaderContainer = () => {
  const navigate = useNavigate();

  const onBackComponentContainerClick = useCallback(() => {
    navigate("/mainpage");
  }, [navigate]);

  return (
    <div className="absolute w-[calc(100%_-_48px)] top-[90px] right-[24px] left-[24px] shadow-[0px_1px_2px_rgba(0,_0,_0,_0.25)] h-[119.7px] flex flex-col items-start justify-start text-center text-xs text-white font-body">
      <div className="self-stretch flex-1 rounded-t-sm rounded-b-none bg-white flex flex-row items-center justify-between py-0 px-2.5 text-left text-5xl text-black">
        <div className="flex flex-row items-center justify-start gap-[6px]">
          <img
            className="relative w-[37px] h-[37px] object-cover"
            alt=""
            src="/settingsicon@2x.png"
          />
          <div className="relative">Settings</div>
        </div>
        <div className="flex flex-row items-center justify-start text-center text-xs text-gray-500">
          <div
            className="rounded-3xs box-border w-[55px] h-7 flex flex-row items-center justify-center p-2.5 cursor-pointer border-[1px] border-solid border-silver-100"
            onClick={onBackComponentContainerClick}
          >
            <div className="flex-1 relative">BACK</div>
          </div>
        </div>
      </div>
      <div className="self-stretch flex-1 bg-white flex flex-row items-center justify-start py-[7px] px-[18px] gap-[17px]">
        <div className="rounded-sm bg-mediumslateblue-200 w-[165px] h-[27px] overflow-hidden shrink-0 flex flex-row items-center justify-center">
          <div className="self-stretch flex-1 relative tracking-[-0.02em] leading-[22px] font-semibold flex items-center justify-center">
            CREATE WALLET BACKUP
          </div>
        </div>
        <div className="rounded-sm bg-mediumslateblue-200 w-[162px] h-[27px] overflow-hidden shrink-0 flex flex-row items-center justify-center">
          <div className="self-stretch flex-1 relative tracking-[-0.02em] leading-[22px] font-semibold flex items-center justify-center">
            MANAGE TRANSACTIONS
          </div>
        </div>
      </div>
      <div className="self-stretch flex-1 rounded-t-none rounded-b-sm bg-white flex flex-col items-end justify-center py-[5px] px-[18px]">
        <div className="rounded-sm bg-mediumslateblue-200 shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] w-[162px] h-[27px] overflow-hidden shrink-0 flex flex-row items-start justify-start">
          <div className="self-stretch flex-1 relative tracking-[-0.02em] leading-[22px] font-semibold flex items-center justify-center">
            EXPORT ACTIVITY LOG
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsHeaderContainer;
