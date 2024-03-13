import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    networkType: 'Mainnet',
    confirmation: false,
    walletName: '',
    password: '',
    confirmPassword: '',
    termsConfirmation: false,
    mnemonic: ''
};

const wizardSlice = createSlice({
    name: 'wizard',
    initialState,
    reducers: {
        setNetworkType(state, action) {
            state.networkType = action.payload;
        },
        setConfirmation(state, action) {
            state.confirmation = action.payload;
        },
        setWalletName(state, action) {
            state.walletName = action.payload;
        },
        setPassword(state, action) {
            state.password = action.payload;
        },
        setConfirmPassword(state, action) {
            state.confirmPassword = action.payload;
        },
        setTermsConfirmation(state, action) {
            state.termsConfirmation = action.payload;
        },
        setMnemonic(state, action) {
            state.mnemonic = action.payload;
        }
    },
});

export const wizardActions = wizardSlice.actions;

export default wizardSlice.reducer;