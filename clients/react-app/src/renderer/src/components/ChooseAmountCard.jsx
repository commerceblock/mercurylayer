import StatecoinValueButton from "./StatecoinValueButton";

const ChooseAmountCard = () => {
  return (
    <div className="self-stretch rounded-sm bg-white shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[305px] overflow-hidden shrink-0 flex flex-row items-start justify-center p-2.5 box-border gap-[10px] mix-blend-normal text-center text-3xs text-black font-body-small">
      <div className="self-stretch w-[55px] overflow-hidden shrink-0 flex flex-row items-center justify-center py-2.5 px-0 box-border">
        <div className="flex-1 relative">Select Statecoin Value</div>
      </div>
      <div className="self-stretch flex-1 overflow-hidden flex flex-row flex-wrap items-center justify-start py-2.5 px-[5px] gap-[5px]">
        <StatecoinValueButton
          statecoinValueButtonBorder="none"
          bTCDisplay="inline-block"
          liquidityLowDisplay="inline-block"
        />
        <StatecoinValueButton
          statecoinValueButtonBorder="none"
          bTCDisplay="inline-block"
          liquidityLowDisplay="inline-block"
        />
        <StatecoinValueButton
          statecoinValueButtonBorder="none"
          bTCDisplay="inline-block"
          liquidityLowDisplay="inline-block"
        />
        <StatecoinValueButton
          statecoinValueButtonBorder="none"
          bTCDisplay="inline-block"
          liquidityLowDisplay="inline-block"
        />
        <StatecoinValueButton
          statecoinValueButtonBorder="none"
          bTCDisplay="inline-block"
          liquidityLowDisplay="inline-block"
        />
        <StatecoinValueButton
          statecoinValueButtonBorder="none"
          bTCDisplay="inline-block"
          liquidityLowDisplay="inline-block"
        />
        <StatecoinValueButton
          statecoinValueButtonBorder="none"
          bTCDisplay="inline-block"
          liquidityLowDisplay="inline-block"
        />
      </div>
    </div>
  );
};

export default ChooseAmountCard;
