import { useMemo } from "react";

const DepositStepper3 = ({
  steppers3BTCDetailsIPosition,
  steppers3BTCDetailsIHeight,
  steppers3BTCDetailsIWidth,
  steppers3BTCDetailsITop,
  steppers3BTCDetailsIRight,
  steppers3BTCDetailsIBottom,
  steppers3BTCDetailsILeft,
}) => {
  const steppers3BTCDetailsIStyle = useMemo(() => {
    return {
      position: steppers3BTCDetailsIPosition,
      height: steppers3BTCDetailsIHeight,
      width: steppers3BTCDetailsIWidth,
      top: steppers3BTCDetailsITop,
      right: steppers3BTCDetailsIRight,
      bottom: steppers3BTCDetailsIBottom,
      left: steppers3BTCDetailsILeft,
    };
  }, [
    steppers3BTCDetailsIPosition,
    steppers3BTCDetailsIHeight,
    steppers3BTCDetailsIWidth,
    steppers3BTCDetailsITop,
    steppers3BTCDetailsIRight,
    steppers3BTCDetailsIBottom,
    steppers3BTCDetailsILeft,
  ]);

  return (
    <div
      className="flex flex-row items-center justify-center gap-[7px] text-left text-sm text-white font-body"
      style={steppers3BTCDetailsIStyle}
    >
      <div className="w-[22px] h-[22px] flex flex-row items-center justify-center relative gap-[10px]">
        <div className="self-stretch flex-1 relative rounded-[50%] bg-gray-400 z-[0]" />
        <div className="absolute my-0 mx-[!important] top-[calc(50%_-_9px)] left-[calc(50%_-_4px)] font-extralight z-[1]">
          3
        </div>
      </div>
      <div className="relative w-[76px] h-[17px] text-gray-400">
        <div className="absolute top-[0px] left-[0px] font-extralight">
          BTC Details
        </div>
      </div>
    </div>
  );
};

export default DepositStepper3;
