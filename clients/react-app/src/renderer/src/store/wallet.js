import { createSlice } from '@reduxjs/toolkit';
import thunks from './thunks';
import coinStatus from './fulfilled_thunks/coinStatus';
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
        transferReceive(state, action) {

            let coinsUpdated = action.payload.coinsUpdated;

            console.log('transferReceive coinsUpdated', coinsUpdated);

            for (let i = 0; i < coinsUpdated.length; i++) {
                let coinInfo = coinsUpdated[i];
                let wallet = state.wallets.find(w => w.name === coinInfo.walletName);
                utils.updateCoinByPublicKey(coinInfo.updatedCoin, wallet);
                utils.replaceBackupTxs(state, coinInfo.updatedCoin, coinInfo.backupTransactions);
            }
        },

        /*broadcastBackupTransaction(state, action) {

            console.log('broadcastBackupTransaction action.payload', action.payload);

            let wallet = state.wallets.find(w => w.name === action.payload.walletName);

            let newCoin = action.payload.newCoin;
                        
            utils.updateCoin(newCoin, wallet);

            if (action.payload.activity) {
                wallet.activities.push(action.payload.activity);
            }
        }*/
    },
    extraReducers: (builder) => {
        builder.addCase(thunks.createWallet.fulfilled, (state, action) => {
            state.wallets.push(action.payload);
        })

        builder.addCase(thunks.newDepositAddress.fulfilled, (state, action) => {
            let wallet = state.wallets.find(w => w.name === action.payload.walletName);
            wallet.coins.push(action.payload.coin);
        })

        coinStatus.handleConfirmation(builder);

        builder.addCase(thunks.broadcastBackupTransaction.fulfilled, (state, action) => {
            console.log('updateCoins action.payload', action.payload);

            let wallet = state.wallets.find(w => w.name === action.payload.walletName);

            let newCoin = action.payload.newCoin;
                        
            utils.updateCoin(newCoin, wallet);

            if (action.payload.activity) {
                wallet.activities.push(action.payload.activity);
            }
        })

        builder.addCase(thunks.executeTransferSend.fulfilled, (state, action) => {
            console.log('--> executeTransferSend action.payload', action.payload);

            let wallet = state.wallets.find(w => w.name === action.payload.walletName);

            console.log('--> wallet', wallet);

            let updatedCoin = action.payload.updatedCoin;

            console.log('--> updatedCoin', updatedCoin);
                        
            utils.updateCoin(updatedCoin, wallet);
            
            console.log('--> utils.updateCoin');

            wallet.activities.push(action.payload.activity);

            console.log('--> wallet.activities');

            utils.insertNewBackupTx(state, updatedCoin, action.payload.newBackupTx);
        })
    }
});

export const walletActions = walletSlice.actions;

export default walletSlice.reducer;