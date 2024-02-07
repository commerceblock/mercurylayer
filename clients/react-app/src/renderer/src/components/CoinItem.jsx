import { useState } from 'react';
import utils from '../logic/utils';

const CoinItem = ({ coin }) => {
    const { amount, aggregated_address, status } = coin;



    const formattedAmount = utils.convertSatoshisToBTC(amount);

    // Truncate the address for display
    const truncatedAddress = `${aggregated_address.substring(0, 30)}...`;

    // State to manage whether the address is copied to clipboard
    const [isCopied, setIsCopied] = useState(false);

    // Function to copy the truncated address to clipboard
    const copyToClipboard = () => {
        navigator.clipboard.writeText(aggregated_address);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 3000); // Reset copied state after 3 seconds
    };

    return (
        <div className="bg-whitesmoke shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[135px] overflow-hidden flex flex-row items-center justify-center py-0 px-2.5 box-border text-center text-base text-black font-body-small self-stretch">
            <div className="self-stretch flex-1 overflow-hidden flex flex-row items-center justify-center p-2.5">
                <div className="relative tracking-[-0.02em] leading-[22px] font-semibold">
                    {formattedAmount} BTC
                </div>
            </div>
            <div className="self-stretch flex-1 overflow-hidden flex flex-row items-center justify-center p-2.5">
                <div className="relative tracking-[-0.02em] leading-[22px] font-semibold" title={aggregated_address} onClick={copyToClipboard}>
                    {truncatedAddress}
                    {isCopied && <span className="text-xs text-green-500 ml-1">(Copied)</span>}
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
