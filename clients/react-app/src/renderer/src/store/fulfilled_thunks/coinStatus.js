import thunks from '../thunks';
import utils from '../utils';
import coinStatus from '../../logic/coinStatus';

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

                let existingBackupTxItems = state.backupTxs.filter(b => b.statechain_id === newCoin.statechain_id);

                if (existingBackupTxItems.length > 0) {
                    let existingBackupTx = existingBackupTxItems[0];
                    existingBackupTx.backupTxs.push(depositResult.backupTx);
                } else {
                    state.backupTxs.push({
                        statechain_id: newCoin.statechain_id,
                        backupTxs: [depositResult.backupTx]
                    });
                }
            }
        }
    }
    
}

const handleWithdrawalOrTransferConfirmation = (state, withdrawalResult) => {
    const wallet = state.wallets.find(w => w.name === withdrawalResult.walletName);
    const newCoin = withdrawalResult.newCoin;
    utils.updateCoin(newCoin, wallet);
}

const handleConfirmation = (builder) => {

    builder.addCase(thunks.updateCoins.fulfilled, (state, action) => {
        console.log('updateCoins action.payload', action.payload);

        for (let i = 0; i < action.payload.length; i++) {
            if (action.payload[i].action == coinStatus.Actions.DEPOSIT_CONFIMED) {
                handleDepositConfirmation(state, action.payload[i]);
            } else if (action.payload[i].action == coinStatus.Actions.WITHDRAWAL_CONFIMED || 
                action.payload[i].action == coinStatus.Actions.TRANSFER_CONFIMED) {
                handleWithdrawalOrTransferConfirmation(state, action.payload[i]);
            }
        }  
    })
}

export default { handleConfirmation };