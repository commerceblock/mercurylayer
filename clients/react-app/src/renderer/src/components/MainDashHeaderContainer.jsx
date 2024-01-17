import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

const MainDashHeaderContainer = () => {
  const navigate = useNavigate();

  const onDepositButtonContainerClick = useCallback(() => {
    navigate("/depositpage");
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
    <div className="absolute w-[calc(100%_-_48px)] top-[90px] right-[24px] left-[24px] rounded-sm bg-white shadow-[0px_1px_2px_rgba(0,_0,_0,_0.25)] h-[140px] text-center text-xs text-black font-body lg:w-[96%] sm:w-[95%]">
      <div className="absolute top-[0px] left-[0px] w-[380px] shrink-0 flex flex-row items-center justify-start py-[13px] px-3 box-border gap-[13px] text-left text-5xl lg:w-[380%]">
        <img
          className="relative w-[15px] h-[15px] object-cover"
          alt=""
          src="/statecoinicon@2x.png"
        />
        <div className="relative">0 BTC</div>
        <div className="relative text-3xs text-gray-100">
          0 Statecoins in wallet
        </div>
      </div>
      <div className="absolute top-[42px] left-[0px] w-[380px] h-[45px] overflow-hidden flex flex-row items-center justify-start py-[5px] px-3 box-border text-gray-300">
        <div className="flex flex-row items-center justify-start">
          <div className="shrink-0 flex flex-row items-center justify-end">
            <div className="relative tracking-[-0.02em] leading-[22px] font-semibold">
              Hide balance
            </div>
          </div>
        </div>
      </div>
      <div className="absolute w-full top-[calc(50%_+_18px)] right-[0px] left-[0px] h-[52px] flex flex-row items-center justify-between py-[5px] px-2.5 box-border text-white">
        <div className="flex flex-row items-center justify-start py-2.5 px-0 gap-[14px]">
          <div
            className="rounded-sm bg-darkorange shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] w-[76px] h-[25px] flex flex-row items-start justify-start cursor-pointer"
            onClick={onDepositButtonContainerClick}
          >
            <div className="self-stretch flex-1 flex flex-row items-start justify-start">
              <div className="self-stretch flex-1 flex flex-row items-start justify-start">
                <img
                  className="relative w-6 h-6 overflow-hidden shrink-0 object-cover"
                  alt=""
                  src="/pluscircle@2x.png"
                />
                <div className="self-stretch relative tracking-[-0.02em] leading-[22px] font-semibold flex items-center justify-center w-[49px] shrink-0">
                  Deposit
                </div>
              </div>
            </div>
          </div>
          <div
            className="rounded-sm bg-darkorange shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] w-[85px] h-[25px] flex flex-row items-start justify-start cursor-pointer"
            onClick={onWithdrawButtonContainerClick}
          >
            <div className="self-stretch w-20 flex flex-row items-start justify-start">
              <div className="self-stretch flex-1 flex flex-row items-start justify-start">
                <img
                  className="relative w-[22px] h-[25px] overflow-hidden shrink-0 object-cover"
                  alt=""
                  src="/frame-11@2x.png"
                />
                <div className="self-stretch relative tracking-[-0.02em] leading-[22px] font-semibold flex items-center justify-center w-[58px] shrink-0">
                  Withdraw
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-row items-center justify-end py-2.5 px-0 gap-[14px]">
          <div
            className="self-stretch rounded-sm bg-mediumslateblue-200 shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] flex flex-row items-start justify-end cursor-pointer"
            onClick={onSendButtonContainerClick}
          >
            <div className="flex flex-row items-start justify-start">
              <img
                className="relative w-6 h-6 overflow-hidden shrink-0 object-cover"
                alt=""
                src="/call-made-fill0-wght400-grad0-opsz24-1@2x.png"
              />
              <div className="shrink-0 flex flex-row items-start justify-start">
                <div className="relative tracking-[-0.02em] leading-[22px] font-semibold flex items-center justify-center w-[50px] h-6 shrink-0">
                  SEND
                </div>
              </div>
            </div>
          </div>
          <div
            className="rounded-sm bg-mediumslateblue-200 shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] shrink-0 flex flex-row items-start justify-end cursor-pointer"
            onClick={onReceiveButtonContainerClick}
          >
            <div className="self-stretch flex flex-row items-start justify-start">
              <img
                className="relative w-[26px] h-[25px] overflow-hidden shrink-0 object-cover"
                alt=""
                src="/call-received-fill0-wght400-grad0-opsz24-1@2x.png"
              />
              <div className="flex flex-row items-start justify-start">
                <div className="relative tracking-[-0.02em] leading-[22px] font-semibold flex items-center justify-center w-[62px] h-6 shrink-0">
                  RECEIVE
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainDashHeaderContainer;
