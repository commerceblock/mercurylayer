import { useDispatch, useSelector } from 'react-redux'
import { useState } from 'react'

import WalletControl from './WalletControl';

import coinStatus from '../logic/coinStatus';

import thunks from '../store/thunks';

export default function WalletList({ ...props }) {

    const dispatch = useDispatch();

    const wallets = useSelector(state => state.wallet.wallets);

    const [isUpdatingCoins, setIsUpdatingCoins] = useState(false);

    let walletList = wallets.map((wallet) => {
        return (
            <WalletControl key={wallet.name} wallet={wallet} />
        )
    });

    const updateCoins = async () => {
        setIsUpdatingCoins(true);
        // await coinStatus.updateCoins(wallets);
        dispatch(thunks.updateCoins(wallets));
        setIsUpdatingCoins(false);
    };

    return (
        <div {...props}>
            <h2>Wallet List</h2>
            <div>{!isUpdatingCoins && <button onClick={updateCoins}>Update Coins</button>}</div>
            {walletList}
        </div>
    )
}