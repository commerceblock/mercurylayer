import { useDispatch } from 'react-redux'
import { useState } from 'react'

import WalletActivity from './WalletActivity';

import transferReceive from '../logic/transferReceive'
import { walletActions } from '../store/wallet'

import deposit from './../logic/deposit';

import CoinItem from './CoinItem';

export default function WalletControl({wallet}) {

    const [isGeneratingNewDepositAddress, setIsGeneratingNewDepositAddress] = useState(false);

    const dispatch = useDispatch();

    const newDepositAddress = async () => {

      setIsGeneratingNewDepositAddress(true);

      let amount = 10000;
      let newAddress = await deposit.newAddress(wallet, amount);
      await dispatch(walletActions.newDepositAddress(newAddress));

      setIsGeneratingNewDepositAddress(false);
    };

    const getNewTransferAddress = async () => {
      let newCoin = await transferReceive.newTransferAddress(wallet);
      await dispatch(walletActions.insertNewTransferCoin(newCoin));
    };

    
    let newDepositAddrButton = <button className="fancy-button" disabled={isGeneratingNewDepositAddress} onClick={newDepositAddress} style={{ marginRight: '10px', marginTop: '20px' }}>New Deposit Address</button>;
    let newTransferAddrButton = <button className="fancy-button" onClick={getNewTransferAddress}>New Transfer Address</button>;

    let coinsClone = structuredClone(wallet.coins);
    coinsClone.reverse();

    let coinList = coinsClone.map((coin, index) => 
      <CoinItem key={index} coin={coin} wallet={wallet}/>
    );

    let sortedActivities = wallet.activities.slice().sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });

    let walletActivityList = 
      <ul style={{marginTop: 10}} >
        {sortedActivities.map((activity, index) => 
          <li key={index}><WalletActivity activity={activity}/></li>
        )}
      </ul>;

    return (
        <div style={{marginTop: 15, padding: 15}}>
            <div key={wallet.name}>
                <h3>Name: {wallet.name}</h3>
                <div>blockheight: {wallet.blockheight}</div>
            </div>
            <div>{newDepositAddrButton} {newTransferAddrButton}</div>
            <h3 style={{marginTop: 20}}>Coins</h3>
            <div>{coinList}</div>
            <h3 style={{marginTop: 20}}>Activities</h3>
            <div>{walletActivityList}</div>
        </div>
    );
};