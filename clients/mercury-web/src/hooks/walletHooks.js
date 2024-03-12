// walletHooks.js
import { useSelector } from 'react-redux';

export const useLoggedInWallet = () => {
  const walletName = useSelector(state => state.wallet.selectedWallet);
  const wallets = useSelector(state => state.wallet.wallets);
  const loggedInWallet = wallets.find(w => w.name === walletName);

  return loggedInWallet;
};