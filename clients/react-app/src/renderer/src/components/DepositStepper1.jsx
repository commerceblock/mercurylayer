import { useMemo } from "react";

const DepositStepper1 = ({
  steppers1ChooseAmountPosition,
  steppers1ChooseAmountHeight,
  steppers1ChooseAmountWidth,
  steppers1ChooseAmountTop,
  steppers1ChooseAmountRight,
  steppers1ChooseAmountBottom,
  steppers1ChooseAmountLeft,
}) => {
  const steppers1ChooseAmountStyle = useMemo(() => {
    return {
      position: steppers1ChooseAmountPosition,
      height: steppers1ChooseAmountHeight,
      width: steppers1ChooseAmountWidth,
      top: steppers1ChooseAmountTop,
      right: steppers1ChooseAmountRight,
      bottom: steppers1ChooseAmountBottom,
      left: steppers1ChooseAmountLeft,
    };
  }, [
    steppers1ChooseAmountPosition,
    steppers1ChooseAmountHeight,
    steppers1ChooseAmountWidth,
    steppers1ChooseAmountTop,
    steppers1ChooseAmountRight,
    steppers1ChooseAmountBottom,
    steppers1ChooseAmountLeft,
  ]);

  return (
    <div
      className="flex flex-row items-center justify-center gap-[5px] text-left text-sm text-white font-body"
      style={steppers1ChooseAmountStyle}
    >
      <div className="w-[22px] h-[22px] flex flex-row items-center justify-center relative gap-[10px]">
        <div className="self-stretch flex-1 relative rounded-[50%] bg-mediumslateblue-300 z-[0]" />
        <div className="absolute my-0 mx-[!important] top-[calc(50%_-_9px)] left-[calc(50%_-_3px)] font-extralight z-[1]">
          1
        </div>
      </div>
      <div className="relative w-[103px] h-[17px] text-gray-400">
        <div className="absolute top-[0%] left-[0%] font-extralight">
          Choose amount
        </div>
      </div>
    </div>
  );
};

export default DepositStepper1;
