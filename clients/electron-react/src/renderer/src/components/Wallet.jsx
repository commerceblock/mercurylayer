import { Fragment } from 'react';
import { useSelector } from 'react-redux'

export default function Wallet() {
    const wallets = useSelector(state => state.wallet.wallets);
    

    let walletList = wallets.map((wallet) => 
        <>
        <li key={wallet.name}>{wallet.name}</li>
        {wallet.coins.map((coin, index) => 
            <ul key={index}>
            <li >Deposit address: {coin.aggregated_address}</li>
            <li>Statechain_id: {coin.statechain_id}</li>
            </ul>
        )}
        </>
    );

    return (
          
        <div>
            <h1>Wallets</h1>
            <ul>
                {walletList}
            </ul>
        </div>
    )
}