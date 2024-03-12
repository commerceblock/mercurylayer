import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import utils from "../logic/utils";

import sendImg from "../../resources/send_icon.svg?asset&asarUnpack";
import receiveImg from "../../resources/receive_icon.svg?asset&asarUnpack";
import withdrawImg from "../../resources/withdraw.png?asset&asarUnpack";
import depositImg from "../../resources/deposit.png?asset&asarUnpack";
import statecoinImg from "../../resources/statecoin_icon.png?asset&asarUnpack";

const MainHeaderPanel = ({ wallet }) => {
  const navigate = useNavigate();
  const filteredCoins = wallet.coins.filter(
    (coin) => coin.status === "CONFIRMED"
  );
  const coinAmount = filteredCoins.length;
  // get total satoshi value by adding up all of wallet.coins.amount value
  const totalSatoshiValue = filteredCoins.reduce(
    (total, coin) => total + coin.amount,
    0
  );

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
    <div className="flex-1 rounded-sm bg-white shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] flex flex-col items-center justify-center gap-[1px_0px] min-h-[140px] text-center text-xs text-black font-body-small lg:w-[96%] sm:w-[95%]">
      <div className="self-stretch h-[46px] flex flex-row flex-wrap items-center justify-start py-[13px] px-3 box-border gap-[13px] text-left text-5xl lg:w-[380%]">
        <img
          className="w-[15px] relative h-[15px] object-cover"
          alt=""
          src={statecoinImg}
        />
        <div className="relative">
          {utils.convertSatoshisToBTC(totalSatoshiValue)} BTC
        </div>
        <div className="relative text-3xs text-gray-100">
          {coinAmount} Statecoins in wallet
        </div>
      </div>
      <div className="self-stretch h-[46px] overflow-hidden shrink-0 flex flex-row items-center justify-start py-[5px] px-3 box-border text-gray-400">
        {/* <div className="relative tracking-[-0.02em] leading-[22px] font-semibold">Hide balance</div> */}
      </div>
      <div className="self-stretch rounded-t-none rounded-b-sm flex flex-row flex-wrap items-center justify-between text-white">
        <div className="w-[200px] relative h-[46px]">
          <div className="absolute top-[0px] left-[0px] w-[200px] h-[46px] overflow-hidden flex flex-row items-center justify-start py-0 pr-0 pl-2.5 box-border gap-[0px_10px]">
            <div
              className="w-[82px] rounded-sm bg-darkorange shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-center p-[5px] box-border gap-[0px_5px] cursor-pointer"
              onClick={onDepositButtonContainerClick}
            >
              <img className="w-3 relative h-3" alt="" src={depositImg} />
              <div className="self-stretch flex-1 relative tracking-[-0.02em] leading-[22px] font-semibold flex items-center justify-center">
                DEPOSIT
              </div>
            </div>
            <div
              className="w-24 rounded-sm bg-darkorange shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-center p-[5px] box-border gap-[0px_5px] cursor-pointer"
              onClick={onWithdrawButtonContainerClick}
            >
              <img className="w-3 relative h-3" alt="" src={withdrawImg} />
              <div className="self-stretch w-[69px] relative tracking-[-0.02em] leading-[22px] font-semibold flex items-center justify-center shrink-0">
                WITHDRAW
              </div>
            </div>
          </div>
        </div>
        <div className="w-[200px] relative h-[46px]">
          <div className="absolute top-[0px] left-[0px] w-[200px] h-[46px] overflow-hidden flex flex-row items-start justify-start p-2.5 box-border gap-[0px_10px]">
            <div
              className="w-20 rounded-sm bg-mediumslateblue-200 shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-center p-[5px] box-border gap-[0px_5px] min-w-[75px] cursor-pointer"
              onClick={onSendButtonContainerClick}
            >
              <img
                className="w-6 relative h-6 overflow-hidden shrink-0"
                alt=""
                src={sendImg}
              />
              <div className="self-stretch w-[41px] relative tracking-[-0.02em] leading-[22px] font-semibold flex items-center justify-center shrink-0">
                SEND
              </div>
            </div>
            <div
              className="w-[95px] rounded-sm bg-mediumslateblue-200 shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-center p-[5px] box-border gap-[0px_5px] min-w-[95px] cursor-pointer"
              onClick={onReceiveButtonContainerClick}
            >
              <img
                className="w-6 relative h-6 overflow-hidden shrink-0"
                alt=""
                src={receiveImg}
              />
              <div className="relative tracking-[-0.02em] leading-[22px] font-semibold">
                RECEIVE
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainHeaderPanel;
