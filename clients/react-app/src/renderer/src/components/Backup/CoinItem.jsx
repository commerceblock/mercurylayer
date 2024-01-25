import { useDispatch } from 'react-redux'
import { useState, Fragment } from 'react'

import { useSelector } from 'react-redux'

import transferReceive from '../logic/transferReceive'
import { walletActions } from '../store/wallet'

import withdraw from '../logic/withdraw';

import deposit from './../logic/deposit';

import broadcastBackupTx from '../logic/broadcastBackupTx';

import transferSend from '../logic/transferSend';

import coinEnum from '../logic/coinEnum';

import CoinItem from './CoinItem';

import { Link } from 'react-router-dom';

export default function WalletControl({coin, wallet}) {

    const backupTxs = useSelector(state => state.wallet.backupTxs);

    const [isProcessingCoinRequest, setIsProcessingCoinRequest] = useState(false);

    let [toAddress, setToAddress] = useState("");

    const dispatch = useDispatch();

    const withdrawTransaction = async (coin) => {
        if (coin.status != "CONFIRMED") {
            alert("Coin is not confirmed yet.");
            return;
        }
  
        setIsProcessingCoinRequest(true);
  
        let res = await withdraw.execute(wallet, backupTxs, coin, toAddress);
  
        dispatch(walletActions.withdraw(res));
  
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

        setToAddress("");
  
        setIsProcessingCoinRequest(false);
    }
  
    const transfer = async (coin) => {
        if (coin.status != "CONFIRMED") {
            alert("Coin is not confirmed yet."); 
            return;
        }
  
        setIsProcessingCoinRequest(true);
  
        let transferData = await transferSend.execute(wallet, coin, backupTxs, toAddress);
        await dispatch(walletActions.transfer(transferData));
  
        setToAddress("");
  
        setIsProcessingCoinRequest(false);
    }

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

    const getLabelStyle = () => {
        if (coin.status == coinEnum.INITIALISED || coin.status == coinEnum.IN_MEMPOOL || coin.status == coinEnum.IN_TRANSFER || coin.status == coinEnum.UNCONFIRMED) {
          return "fancy-label fancy-label-orange";
        } else if (coin.status == coinEnum.TRANSFERRED || coin.status == coinEnum.WITHDRAWING || coin.status == coinEnum.WITHDRAWN) {
          return "fancy-label fancy-label-red";
        } else if (coin.status == coinEnum.CONFIRMED) {
          return "fancy-label fancy-label-green";
        }
  
        return "fancy-label fancy-label-orange";
    }

    const getLabelText = () => {
        if (coin.status == coinEnum.INITIALISED) {
            if (coin.statechain_id) {
                return "Awaiting deposit";
            } else {
                return "Awaiting transfer";
            }
        } else if (coin.status == coinEnum.IN_MEMPOOL) {
            return "In Mempool";
        } else if (coin.status == coinEnum.UNCONFIRMED) {
            return "Unconfirmed";
        } else if (coin.status == coinEnum.CONFIRMED) {
            return "Confirmed";
          } else if (coin.status == coinEnum.IN_TRANSFER) {
            return "In Transfer";
        } else if (coin.status == coinEnum.TRANSFERRED) {
          return "Transferred";
        } else if (coin.status == coinEnum.WITHDRAWING) {
            return "Withdrawing";
        } else if (coin.status == coinEnum.WITHDRAWN) {
            return "Withdrawn";
        }
  
        return "";
    }

    let coinAddress = coin.address;

    if (coin.status == coinEnum.INITIALISED && coin.statechain_id) {
        coinAddress = coin.aggregated_address;
    }

    return (
        <div className="card" onClick={console.log('coin', coin)}>
            <ul style={{marginTop: 10}} >
                <li>
                    <span className={getLabelStyle(coin)} style={{marginRight: 20}}><b>{getLabelText()}</b></span>
                    <Link to={`${coin.user_pubkey}`} className="fancy-label fancy-label-white transparent-button">Details</Link>
                </li>
                <li style={{marginTop: 10}}>Address: {coinAddress}</li>
                { coin.statechain_id && <li style={{marginTop: 10}}>Statechain Id: {coin.statechain_id}</li> }
                { coin.amount && <li style={{marginTop: 10}}>Amount: {coin.amount}</li> }
                { coin.locktime && <li style={{marginTop: 10}}>Locktime: {coin.locktime}</li> }
                <li style={{marginTop: 10}}>{actionButtons(coin)}</li>
            </ul>
        </div>
    );

};