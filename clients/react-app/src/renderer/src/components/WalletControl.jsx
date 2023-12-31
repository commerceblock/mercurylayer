import { useDispatch } from 'react-redux'
import { useState } from 'react'

import thunks from '../store/thunks';

import WalletActivity from './WalletActivity';
import CoinBackupTxs from './CoinBackupTxs';

import { useSelector } from 'react-redux'

import transferReceive from '../logic/transferReceive'
import { walletActions } from '../store/wallet'

// import transferSend from '../logic/transferSend';

export default function WalletControl({wallet}) {

    const backupTxs = useSelector(state => state.wallet.backupTxs);

    const [isGeneratingNewDepositAddress, setIsGeneratingNewDepositAddress] = useState(false);

    const [isProcessingCoinRequest, setIsProcessingCoinRequest] = useState(false);

    let [toAddress, setToAddress] = useState("");

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

    const getNewTransferAddress = async () => {
      let newCoin = await transferReceive.newTransferAddress(wallet);
      await dispatch(walletActions.insertNewTransferCoin(newCoin));
      // dispatch(walletActions.addOrUpdateWallet(result.wallet));
    };

    const broadcastBackupTransaction = async (coin, fn) => {
      if (coin.status != "CONFIRMED") {
          alert("Coin is not confirmed yet.");
          return;
      }

      setIsProcessingCoinRequest(true);

      await dispatch(thunks.broadcastBackupTransaction({
        wallet,
        backupTxs,
        coin,
        toAddress 
      }));

      setToAddress("");

      setIsProcessingCoinRequest(false);
    }

    const transfer = async (coin) => {
      if (coin.status != "CONFIRMED") {
          alert("Coin is not confirmed yet."); 
          return;
      }

      // let result = await transferSend.execute(wallet, coin, backupTxs, toAddress);
      // console.log("result", result);

      setIsProcessingCoinRequest(true);

      await dispatch(thunks.executeTransferSend({
        wallet,
        coin,
        backupTxs,
        toAddress 
      }));

      setToAddress("");

      setIsProcessingCoinRequest(false);
    }

    let newDepositAddrButton = <button disabled={isGeneratingNewDepositAddress} onClick={newDepositAddress} style={{ marginRight: '10px' }}>New Deposit Address</button>;
    let newTransferAddrButton = <button onClick={getNewTransferAddress}>New Transfer Address</button>;
      
    let actionButtons = (coin) => {
      if (coin.status == "CONFIRMED") {
        if (isProcessingCoinRequest) {
          return <div><span>Processing...</span></div>;
        } else {
          return (
            <div>
              <input type="text" value={toAddress} onChange={(e) => setToAddress(e.target.value)} style={{ marginRight: '10px' }} />
              <button onClick={() => broadcastBackupTransaction(coin)} style={{ marginRight: '10px' }}>Broadcast Backup Transaction</button>
              <button onClick={() => transfer(coin)}>Transfer</button>
            </div>);
        }
      } else if (coin.status == "WITHDRAWING" || coin.status == "WITHDRAWN") {
        let txid = coin.tx_withdraw ? coin.tx_withdraw : coin.tx_cpfp;
        return (<>Withdrawal Txid: {txid}</>);
      } else {
          return <></>;
      }
    };

    let coinList = wallet.coins.map((coin, index) => 
      <div key={index}>
        <ul style={{marginTop: 10}} >
          <li>Deposit address: {coin.aggregated_address}</li>
          <li>Statechain_id: {coin.statechain_id}</li>
          <li>Amount: {coin.amount}</li>
          <li>Status: {coin.status}</li>
          <li>SE Address: {coin.address}</li>
          <li style={{marginTop: 5}}>{actionButtons(coin)}</li>
        </ul>
        <CoinBackupTxs coin={coin} />
      </div>  
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
        <div style={{marginTop: 15}}>
            <div key={wallet.name}>
                <span>Name: {wallet.name}</span> -  <span>blockheight: {wallet.blockheight}</span>
            </div>
            <div>{newDepositAddrButton} {newTransferAddrButton}</div>
            <h3 style={{marginTop: 20}}>Coins</h3>
            <div>{coinList}</div>
            <h3 style={{marginTop: 20}}>Activities</h3>
            <div>{walletActivityList}</div>
        </div>
    );
};