import { useState } from 'react';
import utils from '../logic/utils';

const ActivityItem = ({ activity }) => {
    const { action, utxo, amount, date } = activity;

    const formattedAmount = utils.convertSatoshisToBTC(amount);


    // State to manage whether the address is copied to clipboard
    const [isCopied, setIsCopied] = useState(false);

    // Function to copy to clipboard
    const copyToClipboard = () => {
        // Implement copying functionality here if needed
    };

    const formatDate = (isoDate) => {
        const dateObject = new Date(isoDate);
        return dateObject.toLocaleString(); // Adjust the format as per your requirement
    };

    return (
        <tr>
            <td className="px-4 py-2">{action}</td>
            <td className="px-4 py-2">{utxo}</td>
            <td className="px-4 py-2">{formattedAmount} BTC</td>
            <td className="px-4 py-2">{formatDate(date)}</td>
        </tr>
    );
};

export default ActivityItem;
