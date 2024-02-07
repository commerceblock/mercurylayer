import { useDispatch, useSelector } from 'react-redux';
import deposit, { depositActions } from "../store/deposit";
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import utils from '../logic/utils';

const DepositBitcoinCard = ({ coin }) => {

  const { aggregated_address, amount } = coin;
  const [description, setDescription] = useState('Set a description...');

  return (
    <div className="self-stretch bg-white shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] overflow-hidden shrink-0 flex flex-row items-center justify-center p-2.5 gap-[10px] text-center text-3xs text-black font-body-small">
      <QRCodeSVG value={aggregated_address} />

      <div className="self-stretch flex-1 overflow-hidden flex flex-col items-start justify-center p-2.5 gap-[10px]">
        <div className="self-stretch overflow-hidden flex flex-row items-center justify-start py-[5px] px-[21px] text-gray-200">
          <div className="relative">{description}</div>
        </div>
        <div className="self-stretch overflow-hidden flex flex-row items-center justify-end p-2.5 gap-[10px] text-7xs">
          <div className="self-stretch rounded-sm bg-lightgray overflow-hidden flex flex-row items-center justify-center py-0.5 px-[5px]">
            <div className="relative">Awaiting</div>
          </div>
          <button className="cursor-pointer [border:none] p-0 bg-black w-2 relative h-2 overflow-hidden shrink-0" />
        </div>
        <div className="self-stretch overflow-hidden flex flex-row items-center justify-start gap-[5px]">
          <div className="self-stretch w-20 bg-aliceblue overflow-hidden shrink-0 flex flex-row items-center justify-center">
            <div className="relative">{utils.convertSatoshisToBTC(amount)} BTC</div>
          </div>
          <img
            className="w-[7px] relative max-h-full"
            alt=""
            src="/arrow-1.svg"
          />
          <div className="flex-1 bg-aliceblue overflow-hidden flex flex-row items-center justify-start p-2.5 gap-[10px]">
            <button className="cursor-pointer [border:none] p-0 bg-[transparent] flex flex-row items-center justify-start">
              <img className="w-2 relative h-2" alt="" src="/icon3.svg" />
            </button>
            <div className="self-stretch flex-1 relative">
              {aggregated_address}
            </div>
          </div>
        </div>
        <div className="self-stretch overflow-hidden flex flex-row items-center justify-center p-2.5 text-7xs">
          <div className="w-[247px] flex flex-row items-start justify-center">
            <div className="self-stretch flex-1 relative">
              <span>{`Create a statecoin by sending `}</span>
              <b>{convertSatoshisToBTC(amount)} BTC</b>
              <span> to the above address in a SINGLE transaction</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepositBitcoinCard;
