import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

const WithdrawHeaderContainer = () => {
  const navigate = useNavigate();

  const onBackComponentContainerClick = useCallback(() => {
    navigate("/mainpage");
  }, [navigate]);

  return (
    <div className="absolute w-[calc(100%_-_48px)] top-[89.1px] right-[24px] left-[24px] shadow-[0px_1px_2px_rgba(0,_0,_0,_0.25)] flex flex-col items-start justify-start text-center text-xs text-black font-body">
      <div className="self-stretch rounded-t-sm rounded-b-none bg-white h-[63px] flex flex-row items-center justify-between p-2.5 box-border text-left text-5xl">
        <div className="flex flex-row items-center justify-start gap-[6px]">
          <img
            className="relative w-[37px] h-[37px] object-cover"
            alt=""
            src="/withdrawbtcicon@2x.png"
          />
          <div className="relative">Withdraw BTC</div>
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
      <div className="self-stretch bg-white flex flex-row items-center justify-start py-2 px-4">
        <div className="relative">Send statecoins to a Bitcoin address</div>
      </div>
      <div className="self-stretch rounded-t-none rounded-b-sm bg-white flex flex-row items-center justify-start py-2 px-4">
        <div className="relative">0 BTC as 0 Statecoin available in wallet</div>
      </div>
    </div>
  );
};

export default WithdrawHeaderContainer;
