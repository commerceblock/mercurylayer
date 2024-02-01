import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const TokenInfoCard = ({ deposit, confirmed, fee, invoice, token_id, processor_id, bitcoin_address, expiry, onPayButtonClick, onDeleteButtonClick }) => {

  const calculateRemainingTime = (expiry) => {
    const currentTime = Math.floor(Date.now() / 1000);
    const remainingSeconds = expiry - currentTime;

    if (remainingSeconds <= 0) {
      // Expiry has passed, set remaining time to 0
      return 0;
    }

    return remainingSeconds;
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }

  const convertTime = (expiry) => {
    const timestamp = expiry * 1000; // Convert seconds to milliseconds
    const date = new Date(timestamp);
    return date;
  }

  const formatUnconfirmed = () => {
    return 'Expired';
  }

  const [remainingTime, setRemainingTime] = useState(calculateRemainingTime(expiry));

  useEffect(() => {
    const intervalId = setInterval(() => {
      setRemainingTime(calculateRemainingTime(expiry));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [expiry]);

  return (
    <div className="self-stretch [filter:drop-shadow(0px_2px_2px_rgba(0,_0,_0,_0.25))] h-[408px] shrink-0 flex flex-row items-center justify-center text-left text-xs text-black font-body-small">
      <div className="self-stretch flex-1 shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] flex flex-col items-center justify-center">
        <div className="self-stretch flex-1 rounded-t-sm rounded-b-none bg-white overflow-hidden flex flex-col items-center justify-center py-[30px] px-10 gap-[15px]">
          <div className="relative">
            Token ID: {token_id}
          </div>
          <div className="relative text-darkgray-100">
            Processor ID: {processor_id}
          </div>
        </div>
        <div className="self-stretch bg-white flex flex-row items-center justify-center p-2.5 gap-[10px] border-t-[1px] border-solid border-darkgray-400 border-b-[1px]">
          <div className="flex-1 h-[180px] flex flex-col items-center justify-center p-2.5 box-border gap-[10px]">
            <div className="relative">Pay by Lightning</div>
            <QRCodeSVG value={invoice} />
            <button className="cursor-pointer self-stretch rounded-sm bg-darkgray-500 shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] flex flex-row items-center justify-center p-2.5">
              <div className="relative">Copy Invoice</div>
            </button>
          </div>
          <div className="flex-1 h-[180px] flex flex-col items-center justify-center p-2.5 box-border gap-[10px]">
            <div className="relative">Pay by Bitcoin</div>
            <QRCodeSVG value={bitcoin_address} />
            <button className="cursor-pointer self-stretch rounded-sm bg-darkgray-500 shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] flex flex-row items-center justify-center p-2.5">
              <div className="relative">Copy Address</div>
            </button>
          </div>
        </div>
        <div className="self-stretch bg-white overflow-hidden flex flex-row items-center justify-center">
          <div className="flex-1 h-[52px] overflow-hidden flex flex-row items-center justify-start py-[27px] px-5 box-border">
            <div className="flex-1 relative">Status:</div>
          </div>
          <div className="flex-1 overflow-hidden flex flex-row items-center justify-center py-[11px] px-[70px]">
            <div className="relative">
              {confirmed ? (
                <>Paid <span className="text-green-500 mr-2">&#10003;</span></>
              ) : (
                <>
                  {remainingTime <= 0 ? '' : `Expires: ${formatTime(remainingTime)}`} &nbsp;&nbsp;
                </>
              )}
            </div>
            <div className="relative">
              {
                !confirmed && <div className="border-t-4 border-yellow border-solid h-5 w-5 rounded-full animate-spin"></div>
              }
            </div>
          </div>
        </div>
        <div className="self-stretch bg-white overflow-hidden flex flex-row items-center justify-center">
          <div className="flex-1 h-[52px] overflow-hidden flex flex-row items-center justify-start py-[27px] px-5 box-border">
            <div className="flex-1 relative">Fee:</div>
          </div>
          <div className="flex-1 overflow-hidden flex flex-row items-center justify-center py-[11px] px-[70px]">
            <div className="relative">{fee} BTC</div>
          </div>
        </div>
        <div className="self-stretch flex-1 rounded-t-none rounded-b-sm bg-white overflow-hidden flex flex-col items-end justify-center py-[39px] px-[33px] text-4xs">
          <div className="relative">
            <span>{`Or pay on `}</span>
            <a target="_blank"
              rel="noopener noreferrer" href={`https://checkout.swiss-bitcoin-pay.ch/${processor_id}`} className="text-mediumslateblue-300">Swiss Bitcoin Pay</a>
          </div>

          <button
            className={`cursor-pointer [border:none] p-0 w-[90px] rounded-sm shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] h-[25px] overflow-hidden shrink-0 flex flex-row items-end justify-end bg-mediumslateblue-200
                }`}
            onClick={() => onPayButtonClick(deposit)}
          >
            <div className="self-stretch flex-1 relative text-3xs tracking-[-0.02em] leading-[22px] font-semibold font-body-small text-white text-center flex items-center justify-center">
              PAY TOKEN
            </div>
          </button>
          <button
            className={`cursor-pointer [border:none] p-0 w-[90px] rounded-sm shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] h-[25px] overflow-hidden shrink-0 flex flex-row items-end justify-end bg-red
                }`}
            onClick={() => onDeleteButtonClick(deposit.id)}
          >
            <div className="self-stretch flex-1 relative text-3xs tracking-[-0.02em] leading-[22px] font-semibold font-body-small text-white text-center flex items-center justify-center">
              DELETE TOKEN
            </div>
          </button>
        </div>
      </div>
    </div >
  );
};

export default TokenInfoCard;