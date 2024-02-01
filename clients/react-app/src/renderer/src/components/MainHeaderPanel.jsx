import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

const MainHeaderPanel = ({ wallet }) => {
  const navigate = useNavigate();
  const coinAmount = wallet.coins.length;
  const onDepositButtonContainerClick = useCallback(() => {
    navigate("/depositpage0");
  }, [navigate]);

  const onWithdrawButtonContainerClick = useCallback(() => {
    navigate("/withdrawpage");
  }, [navigate]);

  const onSendButtonContainerClick = useCallback(() => {
    navigate("/sendpage");
  }, [navigate]);

  const onReceiveButtonContainerClick = useCallback(() => {
    navigate("/receivepage");
  }, [navigate]);

  return (
    <div className="flex-1 rounded-sm bg-white shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[140px] flex flex-col items-center justify-center gap-[1px] min-w-[385px] min-h-[140px] text-center text-xs text-black font-body-small lg:w-[96%] sm:w-[95%]">
      <div className="self-stretch flex-1 flex flex-row items-center justify-start py-[13px] px-3 gap-[13px] text-left text-5xl lg:w-[380%]">
        <img
          className="w-[15px] relative h-[15px] object-cover"
          alt=""
          src="/statecoinicon@2x.png"
        />
        <div className="relative">0 BTC</div>
        <div className="relative text-3xs text-gray-100">
          {coinAmount} Statecoins in wallet
        </div>
      </div>
      <div className="self-stretch flex-1 overflow-hidden flex flex-row items-center justify-start py-[5px] px-3 text-gray-400">
        <div className="relative tracking-[-0.02em] leading-[22px] font-semibold">
          Hide balance
        </div>
      </div>
      <div className="self-stretch flex-1 rounded-t-none rounded-b-sm flex flex-row items-center justify-center text-white">
        <div className="self-stretch flex-1 overflow-hidden flex flex-row items-center justify-start py-0 px-[13px] gap-[10px]">
          <div
            className="w-[82px] rounded-sm bg-darkorange shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-center p-[5px] box-border gap-[5px] cursor-pointer"
            onClick={onDepositButtonContainerClick}
          >
            <img className="w-3 relative h-3" alt="" src="/icon.svg" />
            <div className="self-stretch flex-1 relative tracking-[-0.02em] leading-[22px] font-semibold flex items-center justify-center">
              DEPOSIT
            </div>
          </div>
          <div
            className="w-24 rounded-sm bg-darkorange shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-center p-[5px] box-border gap-[5px] cursor-pointer"
            onClick={onWithdrawButtonContainerClick}
          >
            <img className="w-3 relative h-3" alt="" src="/icon.svg" />
            <div className="self-stretch w-[69px] relative tracking-[-0.02em] leading-[22px] font-semibold flex items-center justify-center shrink-0">
              WITHDRAW
            </div>
          </div>
        </div>
        <div className="self-stretch flex-1 overflow-hidden flex flex-row items-center justify-end p-2.5 gap-[10px]">
          <div
            className="w-20 rounded-sm bg-mediumslateblue-200 shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-center p-[5px] box-border gap-[5px] min-w-[75px] cursor-pointer"
            onClick={onSendButtonContainerClick}
          >
            <img
              className="w-6 relative h-6 overflow-hidden shrink-0"
              alt=""
              src="/sendiconcontainer.svg"
            />
            <div className="self-stretch w-[41px] relative tracking-[-0.02em] leading-[22px] font-semibold flex items-center justify-center shrink-0">
              SEND
            </div>
          </div>
          <div
            className="w-[95px] rounded-sm bg-mediumslateblue-200 shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-center p-[5px] box-border gap-[5px] min-w-[95px] cursor-pointer"
            onClick={onReceiveButtonContainerClick}
          >
            <img
              className="w-6 relative h-6 overflow-hidden shrink-0"
              alt=""
              src="/call-received-fill0-wght400-grad0-opsz24-1.svg"
            />
            <div className="relative tracking-[-0.02em] leading-[22px] font-semibold">
              RECEIVE
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainHeaderPanel;
