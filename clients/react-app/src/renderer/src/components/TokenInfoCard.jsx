import { QRCodeSVG } from 'qrcode.react';

const TokenInfoCard = ({ confirmed, fee, invoice, token_id, processor_id, bitcoin_address }) => {

  return (
    <div className="self-stretch flex-1 flex flex-row items-center justify-center text-left text-xs text-black font-body-small">
      <div className="flex-1 shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[428px] flex flex-col items-center justify-center">
        <div className="self-stretch flex-1 rounded-t-sm rounded-b-none bg-white overflow-hidden flex flex-col items-center justify-center py-[26px] px-[46px] gap-[13px]">
          <div className="relative">
            Token ID: {token_id}
          </div>
          <div className="relative text-darkgray-100">
            Processor ID: {processor_id}
          </div>
        </div>
        <div className="self-stretch bg-white flex flex-row items-center justify-center p-2.5 gap-[10px] border-t-[1px] border-solid border-darkgray-400 border-b-[1px]">
          <div className="self-stretch flex-1 overflow-hidden flex flex-col items-center justify-center p-2.5 gap-[10px]">
            <div className="relative">Pay by Lightning</div>
            <QRCodeSVG value={invoice} />
            <button className="cursor-pointer rounded-sm bg-darkgray-500 shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] overflow-hidden flex flex-row items-center justify-center p-2.5">
              <div className="relative">Copy Invoice</div>
            </button>
          </div>
          <div className="self-stretch flex-1 overflow-hidden flex flex-col items-center justify-center p-2.5 gap-[10px]">
            <div className="relative">Pay by Bitcoin</div>
            <QRCodeSVG value={bitcoin_address} />
            <button className="cursor-pointer rounded-sm bg-darkgray-500 shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] overflow-hidden flex flex-row items-center justify-center p-2.5">
              <div className="relative">Copy Address</div>
            </button>
          </div>
        </div>
        <div className="self-stretch flex-1 rounded-t-none rounded-b-sm bg-white overflow-hidden flex flex-col items-center justify-center py-[39px] px-[33px] gap-[9px]">
          <div className="relative">Status: {confirmed ? 'Paid' : 'Pending'}</div>
          <div className="relative">FEE: {fee} </div>
        </div>
        <div className="self-stretch flex-1 rounded-t-none rounded-b-sm bg-white overflow-hidden flex flex-col items-end justify-center py-[39px] px-[33px] text-4xs">
          <div className="relative">
            <span>{`Or pay on `}</span>
            <a target="_blank"
              rel="noopener noreferrer" href={`https://checkout.swiss-bitcoin-pay.ch/${processor_id}`} className="text-mediumslateblue-300">Swiss Bitcoin Pay</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenInfoCard;
