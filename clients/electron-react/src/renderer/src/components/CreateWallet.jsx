import { useDispatch } from 'react-redux'
import { walletActions } from '../store/wallet'

import { useState } from 'react'

export default function CreateWallet() {

    const [isCreatingWallet, setIsCreatingWallet] = useState(false);
    const [isUpdatingCoins, setIsUpdatingCoins] = useState(false);

    const [walletName, setWalletName] = useState('');

    const dispatch = useDispatch();

    const walletNameChangeHandler = (event) => {
        setWalletName(event.target.value);
    }

    const createWallet = async () => {
        setIsCreatingWallet(true);
        let wallet = await window.api.createWallet(walletName);
        console.log(wallet);
        // add wallet to redux store
        dispatch(walletActions.addOrUpdateWallet(wallet));
        setIsCreatingWallet(false);
        setWalletName('');
      };

      const updateCoins = async () => {
        setIsUpdatingCoins(true);
        const wallets = await window.api.updateCoinStatus();
        dispatch(walletActions.loadWallets(wallets));
        setIsUpdatingCoins(false);
      };

    return (
        <div className="feature-item">
            <article>
                <h2 className="title">Mercury Layer</h2>
                <p className="detail">
                    Statechain is a layer 2 solution for Bitcoin. 
                </p>
                <div style={{ marginTop: '10px' }}>
                    <input type="text" placeholder="Wallet Name" onChange={walletNameChangeHandler} value={walletName} style={{ marginRight: '30px' }}/>

                    {!isCreatingWallet && <button onClick={createWallet}>Create Wallet</button>}
                    {isCreatingWallet &&<span>Creating wallet ...</span>}
                </div>
                <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                   {!isUpdatingCoins && <button onClick={updateCoins}>Update Coins</button>}
                   {isUpdatingCoins && <span>Updating coins...</span>}
                </div>

            </article>
        </div>);
}
