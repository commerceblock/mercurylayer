import { createSlice } from '@reduxjs/toolkit';
import thunks from './thunks';

const initialState = {
    wallets: []
};

const walletSlice = createSlice({
    name: 'wallet',
    initialState,
    reducers: {
        loadWallets(state, action) {
            state.wallets = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder.addCase(thunks.createWallet.fulfilled, (state, action) => {
            state.wallets.push(action.payload);
        })

        builder.addCase(thunks.newDepositAddress.fulfilled, (state, action) => {
            console.log('newDepositAddress action.payload', action.payload);
            let wallet = state.wallets.find(w => w.name === action.payload.walletName);
            wallet.coins.push(action.payload.coin);
        })
    }
});

export const walletActions = walletSlice.actions;

export default walletSlice.reducer;