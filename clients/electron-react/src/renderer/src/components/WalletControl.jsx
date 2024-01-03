import { useDispatch } from 'react-redux'
import { walletActions } from '../store/wallet'

export default function WalletControl({wallet}) {

    const dispatch = useDispatch();

    const getDepositAddressInfo = async () => {
        let payout = {
          walletName: wallet.name,
          amount: 10000
        };
        let depositAddressInfo = await window.api.getDepositAddressInfo(payout);
        console.log(depositAddressInfo);
        dispatch(walletActions.addOrUpdateWallet(depositAddressInfo.wallet));
      };

      const broadcastBackupTransaction = async (coin) => {
        if (coin.status != "CONFIRMED") {
            alert("Coin is not confirmed yet.");
            // broadcast-backup-transaction
        }
      };

    let newDepositButton = <button onClick={getDepositAddressInfo}>Get Deposit Address</button>;

    let coinList = wallet.coins.map((coin, index) => 
            <ul key={index}>
                <li>Deposit address: {coin.aggregated_address}</li>
                <li>Statechain_id: {coin.statechain_id}</li>
                <li>Amount: {coin.amount}</li>
                <li>Status: {coin.status}</li>
                <li style={{ marginTop: '10px', marginBottom: '10px' }}><button onClick={() => broadcastBackupTransaction(coin)}>Broadcast Backup Transaction</button></li>
            </ul>
        );

    return (<>
        <div><br />{newDepositButton}</div>
        <div><br />{coinList}</div>
    </>);
}