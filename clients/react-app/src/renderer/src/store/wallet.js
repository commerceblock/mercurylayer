import { createSlice } from '@reduxjs/toolkit';
import coinStatus from './actions/coinStatus';
import utils from './utils';

const initialState = {
    wallets: [],
    backupTxs: []
};

const walletSlice = createSlice({
    name: 'wallet',
    initialState,
    reducers: {
        loadWallets(state, action) {
            state.wallets = action.payload;
        },
        loadBackupTxs(state, action) {
            state.backupTxs = action.payload;
        },
        insertNewTransferCoin(state, action) {
            let wallet = state.wallets.find(w => w.name === action.payload.walletName);
            wallet.coins.push(action.payload.newCoin);
        },

        createWallet(state, action) {
            state.wallets.push(action.payload);
        },

        newDepositAddress(state, action) {
            let wallet = state.wallets.find(w => w.name === action.payload.walletName);
            wallet.coins.push(action.payload.coin);
        },

        coinStatus(state, action) {
            coinStatus.handleConfirmation(state, action);
        },

        transferReceive(state, action) {

            let coinsUpdated = action.payload.coinsUpdated;

            for (let i = 0; i < coinsUpdated.length; i++) {
                let coinInfo = coinsUpdated[i];
                let wallet = state.wallets.find(w => w.name === coinInfo.walletName);
                utils.updateCoinByPublicKey(coinInfo.updatedCoin, wallet);
                utils.replaceBackupTxs(state, coinInfo.updatedCoin, coinInfo.backupTransactions);
            }
        },

        withdraw(state, action) {

            let wallet = state.wallets.find(w => w.name === action.payload.walletName);

            let updatedCoin = action.payload.updatedCoin;
                        
            utils.updateCoin(updatedCoin, wallet);
            
            wallet.activities.push(action.payload.activity);

            utils.insertNewBackupTx(state, updatedCoin, action.payload.newBackupTx);

        },

        broadcastBackupTransaction(state, action) {

            let wallet = state.wallets.find(w => w.name === action.payload.walletName);

            let newCoin = action.payload.newCoin;
                        
            utils.updateCoin(newCoin, wallet);

            if (action.payload.activity) {
                wallet.activities.push(action.payload.activity);
            }
        },

        transfer(state, action) {
            console.log('--> executeTransferSend action.payload', action.payload);

            let wallet = state.wallets.find(w => w.name === action.payload.walletName);

            let updatedCoin = action.payload.updatedCoin;
                        
            utils.updateCoin(updatedCoin, wallet);
            
            wallet.activities.push(action.payload.activity);

            utils.insertNewBackupTx(state, updatedCoin, action.payload.newBackupTx);
        }
    }
});

export const walletActions = walletSlice.actions;

export default walletSlice.reducer;