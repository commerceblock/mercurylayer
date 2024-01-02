import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    wallets: []
};

const walletSlice = createSlice({
    name: 'wallet',
    initialState,
    reducers: {
        addOrUpdateWallet(state, action) {
            const index = state.wallets.findIndex(wallet => wallet.name === action.payload.name );

            if (index === -1) {
                // Wallet not found, add new one
                state.wallets.push(action.payload);
            } else {
                // Wallet found, update it
                state.wallets[index] = action.payload;
            }
        },

        loadWallets(state, action) {
            state.wallets = action.payload;
        }
    }
});

export const walletActions = walletSlice.actions;

export default walletSlice.reducer;