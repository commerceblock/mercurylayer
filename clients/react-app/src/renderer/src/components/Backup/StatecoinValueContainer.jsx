const StatecoinValueContainer = () => {
  return (
    <div className="w-[99px] rounded-sm bg-white shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[85px] overflow-hidden flex flex-col items-center justify-start py-[18px] px-[23px] box-border gap-[10px] text-center text-xs text-black font-body">
      <div className="self-stretch relative">0.05 BTC</div>
      <div className="self-stretch relative rounded-12xs bg-royalblue-200 h-1.5 min-w-[60px] min-h-[6px]" />
      <div className="self-stretch flex-1 relative text-5xs">
        Liquidity: Low
      </div>
    </div>
  );
};

export default StatecoinValueContainer;
