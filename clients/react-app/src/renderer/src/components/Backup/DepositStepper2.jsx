import { useMemo } from "react";

const DepositStepper2 = ({
  actionButtonText,
  steppers2DepositTokenPosition,
  steppers2DepositTokenHeight,
  steppers2DepositTokenWidth,
  steppers2DepositTokenTop,
  steppers2DepositTokenRight,
  steppers2DepositTokenBottom,
  steppers2DepositTokenLeft,
  groupDivWidth,
}) => {
  const steppers2DepositTokenStyle = useMemo(() => {
    return {
      position: steppers2DepositTokenPosition,
      height: steppers2DepositTokenHeight,
      width: steppers2DepositTokenWidth,
      top: steppers2DepositTokenTop,
      right: steppers2DepositTokenRight,
      bottom: steppers2DepositTokenBottom,
      left: steppers2DepositTokenLeft,
    };
  }, [
    steppers2DepositTokenPosition,
    steppers2DepositTokenHeight,
    steppers2DepositTokenWidth,
    steppers2DepositTokenTop,
    steppers2DepositTokenRight,
    steppers2DepositTokenBottom,
    steppers2DepositTokenLeft,
  ]);

  const groupDivStyle = useMemo(() => {
    return {
      width: groupDivWidth,
    };
  }, [groupDivWidth]);

  return (
    <div
      className="flex flex-row items-center justify-center gap-[7px] text-left text-sm text-white font-body"
      style={steppers2DepositTokenStyle}
    >
      <div className="w-[22px] h-[22px] flex flex-row items-center justify-center relative gap-[10px]">
        <div className="self-stretch flex-1 relative rounded-[50%] bg-gray-400 z-[0]" />
        <div className="absolute my-0 mx-[!important] top-[calc(50%_-_9px)] left-[calc(50%_-_4px)] font-extralight z-[1]">
          2
        </div>
      </div>
      <div
        className="relative w-[93px] h-[17px] text-gray-400"
        style={groupDivStyle}
      >
        <div className="absolute top-[0px] left-[0px] font-extralight">
          {actionButtonText}
        </div>
      </div>
    </div>
  );
};

export default DepositStepper2;
