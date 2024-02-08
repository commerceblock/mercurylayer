// WithdrawCoinItem.jsx
import utils from '../logic/utils';

const WithdrawCoinItem = ({ coin, onSelectCoin, isSelected }) => {
    const { aggregated_address, amount } = coin;

    const formattedAddress = `${aggregated_address.substring(0, 30)}...`;

    const handleClick = () => {
        onSelectCoin(coin); // Call the function to handle coin selection
    };

    return (
        <div
            className={`self-stretch rounded-sm bg-whitesmoke-200 shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] overflow-hidden shrink-0 flex flex-row items-center justify-center py-[22px] px-[104px] box-border gap-[10px] min-h-[70px] text-left text-xs text-black font-body-small ${isSelected ? 'bg-blue-200' : ''}`}
            onClick={handleClick} // Handle click event
        >
            <div className="relative">{formattedAddress}</div>
            <div className="relative">{utils.convertSatoshisToBTC(amount)} BTC</div>
        </div>
    );
};

export default WithdrawCoinItem;
