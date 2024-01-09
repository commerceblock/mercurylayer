import { useDispatch } from 'react-redux'
import { useState } from 'react'

import WalletActivity from './WalletActivity';
import CoinBackupTxs from './CoinBackupTxs';

import { useSelector } from 'react-redux'

import transferReceive from '../logic/transferReceive'
import { walletActions } from '../store/wallet'

import withdraw from '../logic/withdraw';

import deposit from './../logic/deposit';

import broadcastBackupTx from '../logic/broadcastBackupTx';

import transferSend from '../logic/transferSend';

import coinEnum from '../logic/coinEnum';

export default function WalletControl({wallet}) {

    const backupTxs = useSelector(state => state.wallet.backupTxs);

    const [isGeneratingNewDepositAddress, setIsGeneratingNewDepositAddress] = useState(false);

    const [isProcessingCoinRequest, setIsProcessingCoinRequest] = useState(false);

    let [toAddress, setToAddress] = useState("");

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
      // dispatch(walletActions.addOrUpdateWallet(result.wallet));
    };

    const withdrawTransaction = async (coin) => {
      if (coin.status != "CONFIRMED") {
          alert("Coin is not confirmed yet.");
          return;
      }

      setIsProcessingCoinRequest(true);

      let res = await withdraw.execute(wallet, backupTxs, coin, toAddress);

      console.log("res", res);

      dispatch(walletActions.withdraw(res));

      // await dispatch(thunks.broadcastBackupTransaction({
      //   wallet,
      //   backupTxs,
      //   coin,
      //   toAddress 
      // }));

      setToAddress("");

      setIsProcessingCoinRequest(false);
    }

    const broadcastBackupTransaction = async (coin) => {
      if (coin.status != "CONFIRMED") {
          alert("Coin is not confirmed yet.");
          return;
      }

      setIsProcessingCoinRequest(true);

      let broadcastData = await broadcastBackupTx.execute(wallet, backupTxs, coin, toAddress);
      await dispatch(walletActions.broadcastBackupTransaction(broadcastData));

      /* await dispatch(thunks.broadcastBackupTransaction({
        wallet,
        backupTxs,
        coin,
        toAddress 
      })); */

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

      let transferData = await transferSend.execute(wallet, coin, backupTxs, toAddress);
      await dispatch(walletActions.transfer(transferData));

      setToAddress("");

      setIsProcessingCoinRequest(false);
    }

    let newDepositAddrButton = <button className="fancy-button" disabled={isGeneratingNewDepositAddress} onClick={newDepositAddress} style={{ marginRight: '10px', marginTop: '20px' }}>New Deposit Address</button>;
    let newTransferAddrButton = <button className="fancy-button" onClick={getNewTransferAddress}>New Transfer Address</button>;
      
    let actionButtons = (coin) => {
      if (coin.status == "CONFIRMED") {
        if (isProcessingCoinRequest) {
          return <div><span>Processing...</span></div>;
        } else {
          return (
            <div>
              <input className="fancy-input" type="text" value={toAddress} onChange={(e) => setToAddress(e.target.value)} style={{ marginRight: '10px' }} />
              <button className="fancy-button" onClick={() => withdrawTransaction(coin)} style={{ marginRight: '10px' }}>Withdraw</button>
              <button className="fancy-button" onClick={() => broadcastBackupTransaction(coin)} style={{ marginRight: '10px' }}>Broadcast Backup Transaction</button>
              <button className="fancy-button" onClick={() => transfer(coin)}>Transfer</button>
            </div>);
        }
      } else if (coin.status == "WITHDRAWING" || coin.status == "WITHDRAWN") {
        let txid = coin.tx_withdraw ? coin.tx_withdraw : coin.tx_cpfp;
        return (<>Withdrawal Txid: {txid}</>);
      } else {
          return <></>;
      }
    };

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

    let coinsClone = structuredClone(wallet.coins);
    coinsClone.reverse();

    const getLabel = (coin) => {
      if (coin.status == coinEnum.INITIALISED || coin.status == coinEnum.IN_MEMPOOL || coin.status == coinEnum.IN_TRANSFER || coin.status == coinEnum.UNCONFIRMED) {
        return "fancy-label fancy-label-orange";
      } else if (coin.status == coinEnum.TRANSFERRED || coin.status == coinEnum.WITHDRAWING || coin.status == coinEnum.WITHDRAWN) {
        return "fancy-label fancy-label-red";
      } else if (coin.status == coinEnum.CONFIRMED) {
        return "fancy-label fancy-label-green";
      }

      return "fancy-label fancy-label-orange";
    }

    let coinList = coinsClone.map((coin, index) => 
      <div key={index}>
        <ul style={{marginTop: 10}} >
          <li>Deposit address: {coin.aggregated_address}</li>
          <li>Statechain_id: {coin.statechain_id}</li>
          <li>Amount: {coin.amount}</li>
          <li>Status: <span className={getLabel(coin)}>{coin.status}</span></li>
          <li>SE Address: {coin.address}</li>
          <li>Locktime: {coin.locktime}</li>
          <li style={{marginTop: 5}}>{actionButtons(coin)}</li>
        </ul>
        { (lowestLocktimes[coin.statechain_id] == coin.locktime) ? <CoinBackupTxs coin={coin} walletName={wallet.name}/> : <span></span> }
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