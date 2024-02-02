import { createSlice } from '@reduxjs/toolkit';
import coinStatus from './actions/coinStatus';
import utils from './utils';

const initialState = {
    selectedWallet: '',
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
        selectWallet(state, action) {
            state.selectedWallet = action.payload;
        },
        insertToken(state, action) {
            // find wallet
            let wallet = state.wallets.find(w => w.name === action.payload.walletName);

            // check if the token_id already exists in any wallet
            const isDuplicate = state.wallets.some(w =>
                w.tokens.some(t => t.token_id === action.payload.token.token_id)
            );

            // if it's not a duplicate, push to this wallet
            if (!isDuplicate) {
                wallet.tokens.push(action.payload.token);
            }
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

        setTokenSpent(state, action) {
            const { walletName, token_id } = action.payload;

            // Find the target wallet
            const wallet = state.wallets.find(w => w.name === walletName);

            // Find the target token in the wallet
            const targetToken = wallet.tokens.find(token => token.token_id === token_id);

            // If the token is found, set spent to true
            if (targetToken) {
                targetToken.spent = true;
            }
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
                utils.replaceBackupTxs(state, coinInfo.updatedCoin, coinInfo.backupTransactions, coinInfo.walletName);
            }
        },

        withdraw(state, action) {

            let wallet = state.wallets.find(w => w.name === action.payload.walletName);

            let updatedCoin = action.payload.updatedCoin;

            utils.updateCoin(updatedCoin, wallet);

            wallet.activities.push(action.payload.activity);

            utils.insertNewBackupTx(state, updatedCoin, action.payload.newBackupTx, wallet.name);

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

            utils.insertNewBackupTx(state, updatedCoin, action.payload.newBackupTx, wallet.name);
        }
    }
});

export const walletActions = walletSlice.actions;

export default walletSlice.reducer;