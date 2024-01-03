import { useDispatch } from 'react-redux'
import { walletActions } from '../store/wallet'
import { useState } from 'react'

export default function WalletControl({wallet}) {

    const dispatch = useDispatch();

    let [toAddress, setToAddress] = useState("");

    const getDepositAddressInfo = async () => {
      let payout = {
        walletName: wallet.name,
        amount: 10000
      };
      let result = await window.api.getDepositAddressInfo(payout);
      console.log(result);
      dispatch(walletActions.addOrUpdateWallet(result.wallet));
    };

    const getNewTransferAddress = async () => {
      let result = await window.api.newTransferAddress(wallet.name);
      console.log(result);
      dispatch(walletActions.addOrUpdateWallet(result.wallet));
    };

    const withdrawOrbroadcastBackupTransaction = async (coin, fn) => {
      if (coin.status != "CONFIRMED") {
          alert("Coin is not confirmed yet.");
          return;
      }

      let payout = {
        walletName: wallet.name,
        statechainId: coin.statechain_id,
        toAddress
      };

      // let result = await window.api.broadcastBackupTransaction(payout);
      let result = await fn(payout);
      dispatch(walletActions.addOrUpdateWallet(result.wallet));
    };

    let newDepositAddrButton = <button onClick={getDepositAddressInfo} style={{ marginRight: '10px' }}>New Deposit Address</button>;
    let newTransferAddrButton = <button onClick={getNewTransferAddress}>New Transfer Address</button>;

    let actionButton = (coin) => {
        if (coin.status == "CONFIRMED") {
            return (
              <>
                <input type="text" value={toAddress} onChange={(e) => setToAddress(e.target.value)} style={{ marginRight: '10px' }} />
                <button onClick={() => withdrawOrbroadcastBackupTransaction(coin, window.api.broadcastBackupTransaction)} style={{ marginRight: '10px' }}>Broadcast Backup Transaction</button>
                <button onClick={() => withdrawOrbroadcastBackupTransaction(coin, window.api.withdraw)} style={{ marginRight: '10px' }}>Withdraw</button>
                <button onClick={() => withdrawOrbroadcastBackupTransaction(coin, window.api.transferSend)}>Transfer</button>
              </>);
        } else if (coin.status == "WITHDRAWING" || coin.status == "WITHDRAWN") {
            let txid = coin.tx_withdraw ? coin.tx_withdraw : coin.tx_cpfp;
            return (<>Withdrawal Txid: {txid}</>);
        } else {
            return <></>;
        }
    }

    let coinList = wallet.coins.map((coin, index) => 
            <ul style={{marginTop: 20}} key={index}>
                <li>Deposit address: {coin.aggregated_address}</li>
                <li>Statechain_id: {coin.statechain_id}</li>
                <li>Amount: {coin.amount}</li>
                <li>Status: {coin.status}</li>
                <li>SE Address: {coin.address}</li>
                <li style={{marginTop: 5}}>{actionButton(coin)}</li>
            </ul>
        );

    return (<>
        <div>{newDepositAddrButton} {newTransferAddrButton}</div>
        <div>{coinList}</div>
    </>);
}