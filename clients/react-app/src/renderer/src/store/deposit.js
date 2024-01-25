import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    pending_tokens: [],
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
        },
        updatePaidStatus(state, action) {
            const { token_id, paid } = action.payload;

            // Find the index of the token in pending_tokens
            const tokenIndex = state.pending_tokens.findIndex(token => token.token_id === token_id);

            if (tokenIndex !== -1) {
                // Update the paid status of the token
                state.pending_tokens[tokenIndex].paid = paid;
            }
        },
    },
});

export const depositActions = depositSlice.actions;

export default depositSlice.reducer;
