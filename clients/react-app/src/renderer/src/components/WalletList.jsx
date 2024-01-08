import { useDispatch, useSelector } from 'react-redux'
import { Fragment, useState } from 'react'

import WalletControl from './WalletControl';

/* import thunks from '../store/thunks';

import transferReceive from '../logic/transferReceive'

import { walletActions } from '../store/wallet' */

// import coinStatus from '../logic/coinStatus'

export default function WalletList({ ...props }) {

    // const dispatch = useDispatch();

    const wallets = useSelector(state => state.wallet.wallets);

    // const [isUpdatingCoins, setIsUpdatingCoins] = useState(false);

    let walletList = wallets.map((wallet) => {
        return (
            <Fragment key={wallet.name}>
                <WalletControl  wallet={wallet} />
                <hr />
            </Fragment>
        )
    });

/*     const updateCoins = async () => {
        setIsUpdatingCoins(true);
        // let result = await coinStatus.updateCoins(wallets);
        // console.log("result", result);
        

        let coinsUpdated = await transferReceive.execute(wallets);
        console.log("coinsUpdated", coinsUpdated);
        await dispatch(walletActions.transferReceive({coinsUpdated}));

        await dispatch(thunks.updateCoins(wallets));

        setIsUpdatingCoins(false);
    }; 
    
    <div>{!isUpdatingCoins && <button onClick={updateCoins}>Update Coins</button>}</div>
    */

    return (
        <div {...props}>
            <h2>Wallet List</h2>
            
            {walletList}
        </div>
    )
}