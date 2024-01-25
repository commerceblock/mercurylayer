import { useDispatch, useSelector } from 'react-redux'
import { Fragment, useState } from 'react'

import { useParams } from 'react-router-dom';

import CoinDetails from './../components/CoinDetails';

export default function CoinPage({ ...props }) {

    const params = useParams();

    const wallets = useSelector(state => state.wallet.wallets);

    let wallet = wallets.find(w => w.name === params.walletName);

    let coin = wallet.coins.find(c => c.user_pubkey === params.coinUserPubkey);

    let lowestLocktimes = {};

    wallet.coins.forEach(coin => {
        // Check if the statechain_id has been added to lowestLocktimes
        if (lowestLocktimes[coin.statechain_id]) {
            // Update if the current coin's locktime is lower than the stored one
            if (coin.locktime < lowestLocktimes[coin.statechain_id]) {
                lowestLocktimes[coin.statechain_id] = coin.locktime;
            }
        } else {
            // If this statechain_id is not yet in lowestLocktimes, add it
            lowestLocktimes[coin.statechain_id] = coin.locktime;
        }
    });

    return (
        <div {...props}>
            <CoinDetails  coin={coin} walletName={params.walletName} hasLowestLocktime={lowestLocktimes[coin.statechain_id] == coin.locktime} />
        </div>
    )
}