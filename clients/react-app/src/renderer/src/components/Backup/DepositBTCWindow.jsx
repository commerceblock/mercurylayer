const DepositBTCWindow = () => {
  return (
    <div className="self-stretch relative rounded-sm bg-white shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[200px] overflow-hidden shrink-0 mix-blend-normal text-center text-7xs text-black font-body">
      <div className="absolute top-[32px] left-[14px] bg-tertiary box-border w-[105px] h-[105px] overflow-hidden border-[3px] border-solid border-primary">
        <img
          className="absolute h-full w-full top-[0px] right-[0px] bottom-[0px] left-[0px] max-w-full overflow-hidden max-h-full object-contain"
          alt=""
        />
        <img
          className="absolute h-full w-full top-[0px] right-[0px] bottom-[0px] left-[0px] max-w-full overflow-hidden max-h-full object-contain"
          alt=""
        />
      </div>
      <div className="absolute top-[92px] left-[135px] bg-aliceblue w-[71px] h-[26px] overflow-hidden" />
      <div className="absolute top-[92px] left-[223px] bg-aliceblue w-[158px] h-[26px] overflow-hidden" />
      <img
        className="absolute top-[105px] left-[211px] max-h-full w-[7px]"
        alt=""
        src="/arrow-1.svg"
      />
      <div className="absolute top-[58px] left-[136px] text-3xs text-gray-200">
        Add a description...
      </div>
      <div className="absolute top-[70px] left-[314px] w-11 h-3.5">
        <div className="absolute top-[0px] left-[0px] rounded-sm bg-lightgray w-11 h-3.5 overflow-hidden">
          <div className="absolute top-[3px] left-[3px] inline-block w-[39px]">
            Awaiting...
          </div>
        </div>
      </div>
      <img
        className="absolute h-[4.7%] w-[1.96%] top-[36%] right-[8.09%] bottom-[59.3%] left-[89.95%] max-w-full overflow-hidden max-h-full"
        alt=""
        src="/icon1.svg"
      />
      <div className="absolute top-[148px] left-[135px]">
        Create a statecoin by sending 0.001 BTC to the above address in a SINGLE
        transaction
      </div>
    </div>
  );
};

export default DepositBTCWindow;
