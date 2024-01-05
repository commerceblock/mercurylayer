
import { useDispatch, useSelector } from 'react-redux'
import { useState } from 'react'

import thunks from '../store/thunks';

export default function WalletControl({wallet}) {

    const [isGeneratingNewDepositAddress, setIsGeneratingNewDepositAddress] = useState(false);

    const dispatch = useDispatch();

    const newDepositAddress = async () => {

      setIsGeneratingNewDepositAddress(true);
      let payout = {
        wallet,
        amount: 10000
      };
      await dispatch(thunks.newDepositAddress(payout));
      setIsGeneratingNewDepositAddress(false);
    };

    let newDepositAddrButton = <button disabled={isGeneratingNewDepositAddress} onClick={newDepositAddress} style={{ marginRight: '10px' }}>New Deposit Address</button>;
      
    let coinList = wallet.coins.map((coin, index) => 
      <ul style={{marginTop: 20}} key={index}>
        <li>Deposit address: {coin.aggregated_address}</li>
        <li>Statechain_id: {coin.statechain_id}</li>
        <li>Amount: {coin.amount}</li>
        <li>Status: {coin.status}</li>
        <li>SE Address: {coin.address}</li>
      </ul>
    );

    return (
        <div>
            <div key={wallet.name}>
                <span>Name: {wallet.name}</span> -  <span>blockheight: {wallet.blockheight}</span>
            </div>
            <div>{newDepositAddrButton}</div>
            <div>{coinList}</div>
        </div>
    );
};