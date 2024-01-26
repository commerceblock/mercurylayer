import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    pending_deposits: [],
    lastId: 0
};

const depositSlice = createSlice({
    name: 'deposit',
    initialState,
    reducers: {
        // Add a way to add a deposit object, with empty values
        addDeposit: (state, action) => {
            state.pending_deposits.push(action.payload);
        },

        // Add a way to update a deposit object with new token data
        updateTokenData: (state, action) => {
            const { depositId, tokenId } = action.payload;
            const deposit = state.pending_deposits.find((dep) => dep.id === depositId);
            if (deposit) {
                deposit.token_id = tokenId;
            }
        },

        // Add a way to update the confirmed status of a deposit
        updateConfirmedStatus: (state, action) => {
            const { depositId, confirmedStatus } = action.payload;
            const deposit = state.pending_deposits.find((dep) => dep.id === depositId);
            if (deposit) {
                deposit.token.confirmed = confirmedStatus;
            }
        },

        // Add a way to update a deposit object with new statecoin amount
        updateStatecoinAmount: (state, action) => {
            const { depositId, statecoinAmount } = action.payload;
            const deposit = state.pending_deposits.find((dep) => dep.id === depositId);
            if (deposit) {
                deposit.statecoin_amount = statecoinAmount;
            }
        },

        // Add a way to update a deposit object with new btc_address
        updateBitcoinAddress: (state, action) => {
            const { depositId, bitcoinAddress } = action.payload;
            const deposit = state.pending_deposits.find((dep) => dep.id === depositId);
            if (deposit) {
                deposit.bitcoin_address = bitcoinAddress;
            }
        },

        // Add a way to update a deposit object with new description
        updateDescription: (state, action) => {
            const { depositId, description } = action.payload;
            const deposit = state.pending_deposits.find((dep) => dep.id === depositId);
            if (deposit) {
                deposit.description = description;
            }
        },
    },
});

export const depositActions = depositSlice.actions;
export const {
    addDeposit,
    updateTokenData,
    updateStatecoinAmount,
    updateBitcoinAddress,
    updateDescription,
    updateConfirmedStatus
} = depositSlice.actions;

export default depositSlice.reducer;
