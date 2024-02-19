import { useDispatch, useSelector } from 'react-redux'
import { Fragment, useState } from 'react'

import { useParams } from 'react-router-dom';

import WalletControl from './../components/WalletControl';

export default function WalletList({ ...props }) {

    const params = useParams();

    const wallets = useSelector(state => state.wallet.wallets);

    let wallet = wallets.find(w => w.name === params.walletName);

    return (
        <div {...props}>
            <WalletControl  wallet={wallet} />
        </div>
    )
}