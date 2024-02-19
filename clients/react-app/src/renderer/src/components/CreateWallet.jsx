import { useSelector, useDispatch } from 'react-redux'
import { walletActions } from '../store/wallet'

import { useState } from 'react'

import wallet_manager from './../logic/walletManager';

export default function CreateWallet() {

    const [isCreatingWallet, setIsCreatingWallet] = useState(false);

    const [walletName, setWalletName] = useState('');

    const dispatch = useDispatch();

    const walletNameChangeHandler = (event) => {
        setWalletName(event.target.value);
    }

    const createWallet = async () => {

        if (walletName === '') {
          alert('Please enter a wallet name');
          return;
        }

        setIsCreatingWallet(true);

        // await dispatch(thunks.createWallet(walletName));

        let wallet = await wallet_manager.createWallet(walletName);

        await dispatch(walletActions.createWallet(wallet));


        setIsCreatingWallet(false);
        setWalletName('');
      };
      

    

    return (
        <div className="feature-item custom-header">
            <article>
                <h2 className="title">Mercury Layer</h2>
                <p className="detail">
                    Statechain is a layer 2 solution for Bitcoin. 
                </p>
                <div style={{ marginTop: '10px' }}>
                    <input type="text" placeholder="Wallet Name" onChange={walletNameChangeHandler} value={walletName} style={{ marginRight: '30px' }}  className="fancy-input"/>

                    {!isCreatingWallet && <button onClick={createWallet} className="fancy-button">Create Wallet</button>}
                    {isCreatingWallet &&<span>Creating wallet ...</span>}
                </div>

            </article>
        </div>);
}
