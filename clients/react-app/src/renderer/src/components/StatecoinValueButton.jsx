import { useMemo } from "react";

const StatecoinValueButton = ({
  statecoinValueButtonBorder,
  bTCDisplay,
  liquidityLowDisplay,
}) => {
  const statecoinValueButtonStyle = useMemo(() => {
    return {
      border: statecoinValueButtonBorder,
    };
  }, [statecoinValueButtonBorder]);

  const bTCStyle = useMemo(() => {
    return {
      display: bTCDisplay,
    };
  }, [bTCDisplay]);

  const liquidityLowStyle = useMemo(() => {
    return {
      display: liquidityLowDisplay,
    };
  }, [liquidityLowDisplay]);

  return (
    <div
      className="w-[99px] rounded bg-white h-[85px] overflow-hidden flex flex-col items-center justify-start py-[18px] px-[23px] box-border gap-[10px] text-center text-3xs text-black font-body-small"
      style={statecoinValueButtonStyle}
    >
      <div className="self-stretch relative" style={bTCStyle}>
        0.001 BTC
      </div>
      <div className="self-stretch relative rounded-12xs bg-royalblue-200 h-1.5 min-w-[60px] min-h-[6px]" />
      <div
        className="self-stretch flex-1 relative text-5xs"
        style={liquidityLowStyle}
      >
        Liquidity: Low
      </div>
    </div>
  );
};

export default StatecoinValueButton;
