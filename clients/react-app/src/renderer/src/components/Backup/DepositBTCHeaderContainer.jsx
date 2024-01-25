import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

const DepositBTCHeaderContainer = () => {
  const navigate = useNavigate();

  const onSeed8ContainerClick = useCallback(() => {
    navigate("/mainpage");
  }, [navigate]);

  return (
    <div className="absolute w-[calc(100%_-_48px)] top-[90px] right-[24px] left-[24px] shadow-[0px_1px_2px_rgba(0,_0,_0,_0.25)] h-[121px] text-left text-5xl text-black font-body">
      <div className="absolute h-3/6 w-full top-[0%] right-[0%] bottom-[50%] left-[0%] rounded-sm bg-white flex flex-row items-center justify-between py-0 px-2.5 box-border">
        <div className="flex flex-row items-center justify-start gap-[6px]">
          <img
            className="relative w-[37px] h-[37px] object-cover"
            alt=""
            src="/plusdeposit-1@2x.png"
          />
          <div className="relative">Deposit</div>
        </div>
        <div className="flex flex-row items-center justify-start text-center text-xs text-gray-500">
          <div
            className="rounded-3xs box-border w-[55px] h-7 flex flex-row items-center justify-center p-2.5 cursor-pointer border-[1px] border-solid border-silver-100"
            onClick={onSeed8ContainerClick}
          >
            <div className="flex-1 relative">BACK</div>
          </div>
          <img
            className="relative w-6 h-6 overflow-hidden shrink-0 object-cover"
            alt=""
            src="/dotsvertical@2x.png"
          />
        </div>
      </div>
      <div className="absolute h-3/6 w-full top-[50%] right-[0%] bottom-[0%] left-[0%] rounded-sm bg-white flex flex-row items-start justify-start py-2 px-4 box-border text-center text-xs">
        <div className="relative">Create new statecoins. Deposit Fee: 0.3%</div>
      </div>
    </div>
  );
};

export default DepositBTCHeaderContainer;
