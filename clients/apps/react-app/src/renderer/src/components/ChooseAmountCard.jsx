// ChooseAmountCard.jsx
import React, { useState } from 'react';
import StatecoinValueButton from "./StatecoinValueButton";
import { useDispatch } from 'react-redux';
import { depositActions } from "../store/deposit";


const ChooseAmountCard = ({ onStatecoinSelect, deposit }) => {
  const { id, token } = deposit;
  const { disabled } = token.spent;

  const dispatch = useDispatch();
  const [selectedButton, setSelectedButton] = useState(null);

  const handleButtonClick = (amount) => {
    //console.log('selected statecoin with amount', amount);
    //console.log('token value is:', token);

    setSelectedButton(amount);

    let StatecoinObject = { deposit: deposit, amount: amount, token_id: token.token_id };
    //console.log('statecoinObject:', StatecoinObject);
    onStatecoinSelect(StatecoinObject);

    // Dispatch the action to update the statecoin amount
    dispatch(depositActions.updateStatecoinAmount({
      depositId: id,
      statecoinAmount: amount,
    }));
  };

  const statecoins = [0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.5, 1];

  return (
    <div className="self-stretch rounded-sm bg-white shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] overflow-hidden shrink-0 flex flex-row items-start justify-center p-2.5 gap-[10px] mix-blend-normal text-center text-3xs text-black font-body-small">
      <div className="self-stretch w-[55px] overflow-hidden shrink-0 flex flex-row items-center justify-center py-2.5 px-0 box-border">
        <div className="flex-1 relative">Select Statecoin Value</div>
      </div>
      <div className="self-stretch flex-1 overflow-hidden flex flex-row flex-wrap items-start justify-start py-2.5 px-[5px] gap-[5px]">
        {statecoins.map((amount) => (
          <StatecoinValueButton
            key={amount}
            amount={amount}
            onClick={() => handleButtonClick(amount)}
            isSelected={selectedButton === amount}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
};

export default ChooseAmountCard;