import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    paid_tokens: [],
    pending_tokens: [
        {
            btc_payment_address: "bc1qhvcdx4z34pxhnyp224d32579e6ucs7gfmcdqtp",
            fee: "0.001",
            lightning_invoice: "lnbc1m1pj6lqfcpp5999r0m70ckxej2758wn23d48cn057wcmyl8dq8p2k007l8jpjg7sdp6xgenqe3nvgcnstt9xymxvtf5vymr2tfcxgcxxtf3v9nrxwryvycxyc3svscqzzsxqyz5vqsp52n9z6uwm8ae9dufpd4jtxwpklfa5dwpe3qj479y324vxuqem3ktq9qyyssqwnaeykz66nlhkk7he84g8ahuvn7jk026ezzf66cnrfgm9vqd83u5j24seg6aqpdagr9jx8hg90cl7wwm9x636hh73z2mu2tavg0688spctn8zl",
            processor_id: "294a37efcfc58d992bd43ba6a8b6a7c4df4f3b1b27ced01c2ab3dfef9e41923d",
            token_id: "230f3b18-e16f-4a65-820c-1af38da0bb0d"
        }
    ]
};

const depositSlice = createSlice({
    name: 'deposit',
    initialState,
    reducers: {
        addPendingToken(state, action) {
            state.pending_tokens.push(action.payload);
        },
        removePendingToken(state, action) {
            const tokenIdToRemove = action.payload;
            state.pending_tokens = state.pending_tokens.filter(token => token.token_id !== tokenIdToRemove);
        }
    },
});

export const depositActions = depositSlice.actions;

export default depositSlice.reducer;
