const DepositPositionDeposit1 = () => {
  return (
    <div className="self-stretch flex-1 relative text-left text-sm text-white font-body">
      <div className="absolute h-full w-[27.55%] top-[0%] right-[0%] bottom-[0%] left-[72.45%] flex flex-row items-center justify-center gap-[7px]">
        <div className="w-[22px] h-[22px] flex flex-row items-center justify-center relative gap-[10px]">
          <div className="self-stretch flex-1 relative rounded-[50%] bg-mediumslateblue-300 z-[0]" />
          <div className="w-[9px] absolute my-0 mx-[!important] top-[calc(50%_-_9px)] left-[calc(50%_-_4px)] font-extralight inline-block z-[1]">
            3
          </div>
        </div>
        <div className="w-[76px] relative h-[17px] text-gray-500">
          <div className="absolute top-[0px] left-[0px] font-extralight">
            BTC Details
          </div>
        </div>
      </div>
      <div className="absolute h-full w-[32.03%] top-[0%] right-[30.71%] bottom-[0%] left-[37.26%] flex flex-row items-center justify-center gap-[7px]">
        <div className="w-[22px] h-[22px] flex flex-row items-center justify-center relative gap-[10px]">
          <div className="self-stretch flex-1 relative rounded-[50%] bg-gray-500 z-[0]" />
          <div className="w-[9px] absolute my-0 mx-[!important] top-[calc(50%_-_9px)] left-[calc(50%_-_4px)] font-extralight inline-block z-[1]">
            2
          </div>
        </div>
        <div className="w-[104px] relative h-[17px] text-gray-500">
          <div className="absolute top-[0px] left-[0px] font-extralight">
            Choose Amount
          </div>
        </div>
      </div>
      <div className="absolute h-full w-[34.13%] top-[0%] right-[65.87%] bottom-[0%] left-[0%] flex flex-row items-center justify-center gap-[5px]">
        <div className="w-[22px] h-[22px] flex flex-row items-center justify-center relative gap-[10px]">
          <div className="self-stretch flex-1 relative rounded-[50%] bg-gray-500 z-[0]" />
          <div className="w-1.5 absolute my-0 mx-[!important] top-[calc(50%_-_9px)] left-[calc(50%_-_3px)] font-extralight inline-block z-[1]">
            1
          </div>
        </div>
        <div className="w-[52px] relative h-[17px] text-gray-500">
          <div className="absolute top-[0%] left-[0%] font-extralight">
            Pay Fee
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepositPositionDeposit1;
