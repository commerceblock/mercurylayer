import { useDispatch, useSelector } from 'react-redux'
import { Fragment, useState } from 'react'

import WalletControl from './WalletControl';

import thunks from '../store/thunks';

import transferReceive from '../logic/transferReceive'

import { walletActions } from '../store/wallet'

export default function WalletList({ ...props }) {

    const dispatch = useDispatch();

    const wallets = useSelector(state => state.wallet.wallets);

    const [isUpdatingCoins, setIsUpdatingCoins] = useState(false);

    let walletList = wallets.map((wallet) => {
        return (
            <Fragment key={wallet.name}>
                <WalletControl  wallet={wallet} />
                <hr />
            </Fragment>
        )
    });

    const updateCoins = async () => {
        setIsUpdatingCoins(true);
        // await coinStatus.updateCoins(wallets);
        dispatch(thunks.updateCoins(wallets));

        let coinsUpdated = await transferReceive.execute(wallets);
        console.log("coinsUpdated", coinsUpdated);
        await dispatch(walletActions.transferReceive({coinsUpdated}));

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