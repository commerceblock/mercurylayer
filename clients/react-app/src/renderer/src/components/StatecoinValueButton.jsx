// StatecoinValueButton.jsx


const StatecoinValueButton = ({ amount, isSelected, onClick }) => {
  return (
    <button onClick={onClick} className={`cursor-pointer py-[18px] px-[23px] bg-white w-[99px] rounded box-border h-[85px] overflow-hidden flex flex-col items-center justify-center  ${isSelected ? 'border-[2px] border-solid border-royalblue-200' : ''}`}>
      <div className="self-stretch relative text-3xs font-body-small text-black text-center">
        {amount} BTC
      </div>
    </button>
  );
};

export default StatecoinValueButton;
