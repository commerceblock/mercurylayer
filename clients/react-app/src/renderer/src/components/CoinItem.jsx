const CoinItem = ({ coin }) => {
    const { amount, address, status } = coin;

    // Function to convert satoshis to BTC format
    const convertSatoshisToBTC = (satoshis) => {
        const btcAmount = satoshis / 100000000; // 1 BTC = 100,000,000 satoshis
        return btcAmount.toFixed(3); // Format to 3 decimal places
    };

    const formattedAmount = convertSatoshisToBTC(amount);

    // Truncate the address for display
    const truncatedAddress = `${address.substring(0, 30)}...`;


    return (
        <div className="bg-whitesmoke shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[135px] overflow-hidden flex flex-row items-center justify-center py-0 px-2.5 box-border text-center text-base text-black font-body-small self-stretch">
            <div className="self-stretch flex-1 overflow-hidden flex flex-row items-center justify-center p-2.5">
                <div className="relative tracking-[-0.02em] leading-[22px] font-semibold">
                    {formattedAmount} BTC
                </div>
            </div>
            <div className="self-stretch flex-1 overflow-hidden flex flex-row items-center justify-center p-2.5">
                <div className="relative tracking-[-0.02em] leading-[22px] font-semibold" title={address}>
                    {truncatedAddress}
                </div>
            </div>
            <div className="self-stretch flex-1 overflow-hidden flex flex-col items-center justify-center p-2.5">
                <div className="relative tracking-[-0.02em] leading-[22px] font-semibold">
                    {status}
                </div>
            </div>
        </div>
    );
};

export default CoinItem;
