const TokenInfoCard = () => {
  return (
    <div className="self-stretch h-[428px] shrink-0 flex flex-row items-center justify-center text-left text-xs text-black font-body-small">
      <div className="self-stretch flex-1 shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] flex flex-col items-center justify-center">
        <div className="self-stretch flex-1 rounded-t-sm rounded-b-none bg-white overflow-hidden flex flex-col items-center justify-center py-[26px] px-[46px] gap-[13px]">
          <div className="relative">f530e640-3dbf-4740-8add-16ed38d86926</div>
          <div className="relative text-darkgray-100">
            f530e640-3dbf-4740-8add-16ed38d86926
          </div>
        </div>
        <div className="self-stretch flex-1 bg-white flex flex-col items-center justify-center py-[41px] px-[157px] gap-[10px] border-t-[1px] border-solid border-darkgray-400 border-b-[1px]">
          <div className="relative">QR.Code</div>
          <div className="w-[94px] relative bg-tertiary box-border h-[90px] border-[3px] border-solid border-primary">
            <img
              className="absolute h-full w-full top-[0px] right-[0px] bottom-[0px] left-[0px] max-w-full overflow-hidden max-h-full object-contain"
              alt=""
            />
            <img
              className="absolute h-full w-full top-[0px] right-[0px] bottom-[0px] left-[0px] max-w-full overflow-hidden max-h-full object-contain"
              alt=""
            />
          </div>
        </div>
        <div className="self-stretch flex-1 rounded-t-none rounded-b-sm bg-white overflow-hidden flex flex-col items-center justify-center py-[39px] px-[33px] gap-[9px]">
          <div className="relative">Status</div>
          <div className="relative">Amount</div>
        </div>
      </div>
    </div>
  );
};

export default TokenInfoCard;
