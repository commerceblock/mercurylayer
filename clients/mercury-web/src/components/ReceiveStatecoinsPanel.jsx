import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import receiveImg from "../../resources/receive_icon.png?asset&asarUnpack";

const ReceiveStatecoinsPanel = () => {
  const navigate = useNavigate();

  const onBackButtonContainerClick = useCallback(() => {
    navigate("/mainpage");
  }, [navigate]);

  return (
    <div className="self-stretch flex-1 shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] flex flex-col items-start justify-start text-left text-5xl text-black font-body-small">
      <div className="self-stretch flex-1 rounded-t-sm rounded-b-none bg-white flex flex-row items-center justify-between p-2.5">
        <div className="flex flex-row items-center justify-start gap-[6px]">
          <img
            className="w-[30px] relative h-[30px] object-cover"
            alt=""
            src={receiveImg}
          />
          <div className="relative">Receive Statecoins</div>
        </div>
        <div
          className="flex flex-row items-center justify-start cursor-pointer text-center text-xs text-gray-600"
          onClick={onBackButtonContainerClick}
        >
          <div className="w-[55px] rounded-3xs box-border h-7 flex flex-row items-center justify-center p-2.5 border-[1px] border-solid border-silver-100">
            <div className="flex-1 relative">BACK</div>
          </div>
        </div>
      </div>
      <div className="self-stretch flex-1 bg-white flex flex-row items-center justify-start py-2 px-4 text-center text-xs">
        <div className="relative">
          Use the address below to receive statecoins
        </div>
      </div>
      <div className="self-stretch flex-1 rounded-t-none rounded-b-sm bg-white" />
    </div>
  );
};

export default ReceiveStatecoinsPanel;
