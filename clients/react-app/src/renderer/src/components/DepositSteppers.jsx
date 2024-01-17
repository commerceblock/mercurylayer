import DepositStepper3 from "./DepositStepper3";
import DepositStepper2 from "./DepositStepper2";
import DepositStepper1 from "./DepositStepper1";

const DepositSteppers = () => {
  return (
    <div className="absolute w-[calc(100%_-_1px)] top-[0px] right-[0px] left-[1px] h-[22px]">
      <DepositStepper3
        steppers3BTCDetailsIPosition="absolute"
        steppers3BTCDetailsIHeight="100%"
        steppers3BTCDetailsIWidth="27.56%"
        steppers3BTCDetailsITop="0%"
        steppers3BTCDetailsIRight="0%"
        steppers3BTCDetailsIBottom="0%"
        steppers3BTCDetailsILeft="72.44%"
      />
      <DepositStepper2
        actionButtonText="Pay Fee"
        steppers2DepositTokenPosition="absolute"
        steppers2DepositTokenHeight="100%"
        steppers2DepositTokenWidth="32.02%"
        steppers2DepositTokenTop="0%"
        steppers2DepositTokenRight="30.71%"
        steppers2DepositTokenBottom="0%"
        steppers2DepositTokenLeft="37.27%"
        groupDivWidth="52px"
      />
      <DepositStepper1
        steppers1ChooseAmountPosition="absolute"
        steppers1ChooseAmountHeight="100%"
        steppers1ChooseAmountWidth="34.12%"
        steppers1ChooseAmountTop="0%"
        steppers1ChooseAmountRight="65.88%"
        steppers1ChooseAmountBottom="0%"
        steppers1ChooseAmountLeft="0%"
      />
    </div>
  );
};

export default DepositSteppers;
