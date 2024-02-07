import { useMemo } from "react";

const DepositHeaderPanel = ({
  propBackgroundColor,
  propDisplay,
  onBackButtonContainerClick,
  backDisabled
}) => {
  const backButtonStyle = useMemo(() => {
    return {
      backgroundColor: propBackgroundColor,
    };
  }, [propBackgroundColor]);

  const bACKStyle = useMemo(() => {
    return {
      display: propDisplay,
    };
  }, [propDisplay]);

  return (
    <div className="self-stretch flex-1 shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] flex flex-col items-start justify-between text-left text-5xl text-black font-body-small">
      <div className="self-stretch flex-1 rounded-t-sm rounded-b-none bg-white flex flex-row items-start justify-between py-3 px-2.5">
        <div className="flex flex-row items-center justify-start gap-[6px]">
          <img
            className="w-[37px] relative h-[37px] object-cover"
            alt=""
            src="/plusdeposit-1@2x.png"
          />
          <div className="relative">Deposit</div>
        </div>
        {
          !backDisabled && (
            <div className="flex flex-row items-center justify-start text-center text-xs text-gray-600">
              <div
                className="w-[55px] rounded-3xs box-border h-7 flex flex-row items-center justify-center p-2.5 cursor-pointer border-[1px] border-solid border-silver-100"
                onClick={onBackButtonContainerClick}
                style={backButtonStyle}
              >
                <div className="flex-1 relative" style={bACKStyle}>
                  BACK
                </div>
              </div>
              <img
                className="w-6 relative h-6 overflow-hidden shrink-0"
                alt=""
                src="/dotsvertical.svg"
              />

            </div>)
        }


      </div>
      <div className="self-stretch flex-1 rounded-t-none rounded-b-sm bg-white flex flex-row items-start justify-start py-2 px-4 text-center text-xs">
        <div className="relative">Create new statecoins.</div>
      </div>
    </div>
  );
};

export default DepositHeaderPanel;
