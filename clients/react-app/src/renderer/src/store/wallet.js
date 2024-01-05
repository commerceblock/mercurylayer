import { createSlice } from '@reduxjs/toolkit';
import thunks from './thunks';

const initialState = {
    wallets: []
};

const walletSlice = createSlice({
    name: 'wallet',
    initialState,
    reducers: {
        addWallet(state, action) {
            state.wallets.push(action.payload);
        },

        loadWallets(state, action) {
            state.wallets = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder.addCase(thunks.createWallet.fulfilled, (state, action) => {
            // const wallet = action.payload;
            console.log('action.payload', action.payload);
            // Add user to the state array
            state.wallets.push(action.payload);
            // console.log('action', action);
            // return window.api.insertWallet(action.payload);

        })
    }
});

export const walletActions = walletSlice.actions;

export default walletSlice.reducer;