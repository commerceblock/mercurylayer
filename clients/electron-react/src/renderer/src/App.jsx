

import { useDispatch } from 'react-redux'
import { walletActions } from './store/wallet'


import CreateWallet from './components/CreateWallet'
import { useEffect } from 'react'

import WalletPanel from './components/WalletPanel'


function App() {
  const dispatch = useDispatch();

  

  useEffect(() => {

    let walletsLoaded = false;

    let isMounted = true;

    async function fetchWallets() {
      const wallets = await window.api.getWallets();

      dispatch(walletActions.loadWallets(wallets));

      walletsLoaded = true;
      console.log("Wallets loaded...");
    }

    // This cannot be used for now
    // The code cannot handle asyncronous calls because an outdated wallet instance can be stored in the database
    const executeAndRepeat = async () => {
      if (!isMounted) return;

      try {
        // Don't update coins if wallets haven't been loaded yet
        if (walletsLoaded) {
          const wallets = await window.api.updateCoinStatus();
          dispatch(walletActions.loadWallets(wallets));
          console.log('Coins updated');
        }
      } catch (error) {
        console.error('Error on update coins:', error);
      } finally {
        if (isMounted) {
          setTimeout(executeAndRepeat, 2000); // Wait for 2 seconds before repeating
        }
      }

    };

    fetchWallets();

    // executeAndRepeat();

    // Cleanup function to clear timeout if the component unmounts
    return () => {
        isMounted = false;
    };

  }, []);

  return (
    <div className="container">

      <CreateWallet />

        <WalletPanel />
      
    </div>
  )
}

export default App
