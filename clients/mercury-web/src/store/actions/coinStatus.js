import utils from '../utils.js';
import coinStatus from '../../logic/coinStatus.js';
import coinEnum from '../../logic/coinEnum.js';

const handleDepositConfirmation = (state, depositResult) => {

    if (depositResult != null) {
        let wallet = state.wallets.find(w => w.name === depositResult.walletName);

        if (!wallet.activities) {
            wallet.activities = [];
        }

        if (depositResult.activity) {
            wallet.activities.push(depositResult.activity);
        }

        if (depositResult.newCoin) {

            let newCoin = depositResult.newCoin;
            
            utils.updateCoin(newCoin, wallet);

            if (depositResult.backupTx) {
                utils.insertNewBackupTx(state, newCoin, depositResult.backupTx, wallet.name);
            }
        }
    }
    
}

const handleWithdrawalOrTransferConfirmation = (state, withdrawalResult) => {
    const wallet = state.wallets.find(w => w.name === withdrawalResult.walletName);
    const newCoin = withdrawalResult.newCoin;
    // utils.updateCoin(newCoin, wallet);

    let matchingIndex = wallet.coins.findIndex(coin =>
        coin.statechain_id === newCoin.statechain_id &&
        (coin.status === coinEnum.WITHDRAWING || coin.status === coinEnum.IN_TRANSFER)
    );

    wallet.coins[matchingIndex] = newCoin;
}

const handleConfirmation = (state, action) => {

    console.log('updateCoins action.payload', action.payload);

    for (let i = 0; i < action.payload.length; i++) {
        if (action.payload[i].action == coinStatus.Actions.DEPOSIT_CONFIMED) {
            handleDepositConfirmation(state, action.payload[i]);
        } else if (action.payload[i].action == coinStatus.Actions.WITHDRAWAL_CONFIMED || 
            action.payload[i].action == coinStatus.Actions.TRANSFER_CONFIMED) {
            handleWithdrawalOrTransferConfirmation(state, action.payload[i]);
        }
    }  

}

export default { handleConfirmation };