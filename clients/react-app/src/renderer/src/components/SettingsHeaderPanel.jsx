import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

const SettingsHeaderPanel = () => {
  const navigate = useNavigate();

  const onBackButtonContainerClick = useCallback(() => {
    navigate("/wallet-main-1");
  }, [navigate]);

  return (
    <div className="self-stretch shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[113px] flex flex-col items-center justify-center text-center text-xs text-white font-body-small">
      <div className="self-stretch flex-1 rounded-t-sm rounded-b-none bg-white flex flex-row items-start justify-between py-0 px-2.5 text-left text-5xl text-black">
        <div className="self-stretch flex-1 flex flex-row items-center justify-start gap-[6px]">
          <img
            className="w-[37px] relative h-[37px] object-cover"
            alt=""
            src="/settingsicon@2x.png"
          />
          <div className="relative">Settings</div>
        </div>
        <div
          className="self-stretch flex-1 flex flex-row items-center justify-end cursor-pointer text-center text-xs text-gray-600"
          onClick={onBackButtonContainerClick}
        >
          <div className="w-[55px] rounded-3xs box-border h-7 flex flex-row items-center justify-center p-2.5 border-[1px] border-solid border-silver-100">
            <div className="flex-1 relative">BACK</div>
          </div>
        </div>
      </div>
      <div className="self-stretch flex-1 bg-white flex flex-row items-center justify-between p-2.5">
        <div className="w-[165px] rounded-sm bg-mediumslateblue-200 h-[27px] overflow-hidden shrink-0 flex flex-row items-center justify-center">
          <div className="self-stretch flex-1 relative tracking-[-0.02em] leading-[22px] font-semibold flex items-center justify-center">
            CREATE WALLET BACKUP
          </div>
        </div>
        <div className="w-[162px] rounded-sm bg-mediumslateblue-200 h-[27px] overflow-hidden shrink-0 flex flex-row items-center justify-center">
          <div className="self-stretch flex-1 relative tracking-[-0.02em] leading-[22px] font-semibold flex items-center justify-center">
            MANAGE TRANSACTIONS
          </div>
        </div>
      </div>
      <div className="self-stretch flex-1 rounded-t-none rounded-b-sm bg-white flex flex-row items-center justify-end p-2.5">
        <div className="w-[148px] rounded-sm bg-mediumslateblue-200 shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] h-[23px] overflow-hidden shrink-0 flex flex-row items-start justify-start">
          <div className="self-stretch flex-1 relative tracking-[-0.02em] leading-[22px] font-semibold flex items-center justify-center">
            EXPORT ACTIVITY LOG
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsHeaderPanel;
