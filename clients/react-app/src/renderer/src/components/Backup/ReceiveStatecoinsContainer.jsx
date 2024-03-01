const ReceiveStatecoinsContainer = ({
  transactionId,
  statecoinActionLabel,
  statecoinAddressText,
  onBackComponentContainerClick,
}) => {
  return (
    <div className="absolute w-[calc(100%_-_48px)] top-[90px] right-[24px] left-[24px] shadow-[0px_1px_2px_rgba(0,_0,_0,_0.25)] h-[121px] flex flex-col items-start justify-start text-left text-5xl text-black font-body">
      <div className="self-stretch flex-1 rounded-t-sm rounded-b-none bg-white flex flex-row items-center justify-between p-2.5">
        <div className="flex flex-row items-center justify-start gap-[6px]">
          <img
            className="relative w-[30px] h-[30px] object-cover"
            alt=""
            src={transactionId}
          />
          <div className="relative">{statecoinActionLabel}</div>
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
      <div className="self-stretch flex-1 bg-white flex flex-row items-center justify-start py-2 px-4 text-center text-xs">
        <div className="relative">{statecoinAddressText}</div>
      </div>
      <div className="self-stretch flex-1 rounded-t-none rounded-b-sm bg-white" />
    </div>
  );
};

export default ReceiveStatecoinsContainer;
