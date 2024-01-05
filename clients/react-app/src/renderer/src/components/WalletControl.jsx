import { useDispatch } from 'react-redux'
import { useState } from 'react'

import thunks from '../store/thunks';

import WalletActivity from './WalletActivity';
import CoinBackupTxs from './CoinBackupTxs';

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
      <div key={index}>
        <ul style={{marginTop: 10}} >
          <li>Deposit address: {coin.aggregated_address}</li>
          <li>Statechain_id: {coin.statechain_id}</li>
          <li>Amount: {coin.amount}</li>
          <li>Status: {coin.status}</li>
          <li>SE Address: {coin.address}</li>
        </ul>
        <CoinBackupTxs coin={coin} />
      </div>
    );

    let walletActivityList = 
      <ul style={{marginTop: 10}} >
        {wallet.activities.map((activity, index) => 
          <li key={index}><WalletActivity activity={activity}/></li>
        )}
      </ul>;

    return (
        <div style={{marginTop: 15}}>
            <div key={wallet.name}>
                <span>Name: {wallet.name}</span> -  <span>blockheight: {wallet.blockheight}</span>
            </div>
            <div>{newDepositAddrButton}</div>
            <h3 style={{marginTop: 20}}>Coins</h3>
            <div>{coinList}</div>
            <h3 style={{marginTop: 20}}>Activities</h3>
            <div>{walletActivityList}</div>
        </div>
    );
};