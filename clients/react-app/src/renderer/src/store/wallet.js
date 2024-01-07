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
        }
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
    }
});

export const walletActions = walletSlice.actions;

export default walletSlice.reducer;