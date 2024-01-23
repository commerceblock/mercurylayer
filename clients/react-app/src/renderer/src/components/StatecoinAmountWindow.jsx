import StatecoinValueContainer from "./StatecoinValueContainer";

const StatecoinAmountWindow = () => {
  return (
    <div className="self-stretch rounded-sm bg-white shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[200px] overflow-hidden shrink-0 flex flex-row items-start justify-center p-2.5 box-border gap-[10px] mix-blend-normal text-center text-3xs text-black font-body">
      <div className="self-stretch w-[55px] overflow-hidden shrink-0 flex flex-row items-center justify-center py-2.5 px-0 box-border">
        <div className="flex-1 relative">Select Statecoin Value</div>
      </div>
      <div className="self-stretch flex-1 overflow-hidden flex flex-row flex-wrap items-start justify-start gap-[5px]">
        <StatecoinValueContainer />
        <StatecoinValueContainer />
        <StatecoinValueContainer />
        <StatecoinValueContainer />
        <StatecoinValueContainer />
        <StatecoinValueContainer />
      </div>
    </div>
  );
};

export default StatecoinAmountWindow;
