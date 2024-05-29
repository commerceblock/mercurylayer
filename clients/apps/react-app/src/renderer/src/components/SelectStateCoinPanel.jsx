// SelectStateCoinPanel.jsx
import WithdrawCoinItem from "./WithdrawCoinItem";

const SelectStateCoinPanel = ({ wallet, selectedCoin, onSelectCoin }) => {
    const { coins } = wallet;
    const filteredCoins = coins.filter((coin) => coin.status === 'CONFIRMED');

    const handleCoinClick = (coin) => {
        onSelectCoin(coin); // Call the function to handle coin selection
    };

    return (
        <div className="flex-1 rounded-sm bg-white shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[281px] overflow-hidden flex flex-col items-center justify-start p-2.5 box-border gap-[10px] min-w-[388px] text-left text-xs text-black font-body-small">
            <div className="self-stretch overflow-hidden flex flex-row items-center justify-start py-0 px-2.5 text-base">
                <div className="relative">Select statecoins to Withdraw</div>
            </div>
            <div className="self-stretch overflow-hidden flex flex-row items-start justify-start py-0 px-2.5">
                <div className="relative">Click select coins below</div>
            </div>
            <div className="self-stretch flex-1 overflow-y-auto flex flex-col items-center justify-start p-2.5 gap-[10px]">
                {filteredCoins && filteredCoins.length > 0 ? (
                    filteredCoins.map((coin, index) => {
                        return (
                            <WithdrawCoinItem
                                key={index}
                                coin={coin}
                                onSelectCoin={handleCoinClick}
                                isSelected={coin === selectedCoin}
                            />
                        );
                    })
                ) : (
                    <p>No coins found.</p>
                )}
            </div>
        </div>
    );
};

export default SelectStateCoinPanel;
