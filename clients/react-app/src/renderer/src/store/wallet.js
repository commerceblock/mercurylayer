import { createSlice } from '@reduxjs/toolkit';
import thunks from './thunks';

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

        builder.addCase(thunks.updateCoins.fulfilled, (state, action) => {
            console.log('updateCoins action.payload', action.payload);


            for (let i = 0; i < action.payload.length; i++) {
                let depositResult = action.payload[i];

                if (depositResult != null) {
                    let wallet = state.wallets.find(w => w.name === depositResult.walletName);

                    if (!wallet.activities) {
                        wallet.activities = [];
                    }

                    if (depositResult.activity) {
                        wallet.activities.push(depositResult.activity);
                    }

                    if (depositResult.newCoin) {

                        let newCoin = depositResult.newCoin;
                        
                        // Step 1: Filter coins with the same statechain_id
                        const filteredCoins = wallet.coins.filter(coin =>
                            coin.statechain_id === newCoin.statechain_id
                        );

                        // Step 2: Find the coin with the highest locktime
                        const coinToUpdate = filteredCoins.reduce((max, coin) => 
                            (max.locktime > coin.locktime) ? max : coin
                        );

                        // Step 3: Update the coin
                        const updatedCoins = wallet.coins.map(coin =>
                            (coin === coinToUpdate) ? newCoin : coin
                        );

                        wallet.coins = updatedCoins;


                        if (depositResult.backupTx) {

                            let existingBackupTxItems = state.backupTxs.filter(b => b.statechain_id === newCoin.statechain_id);

                            if (existingBackupTxItems.length > 0) {
                                let existingBackupTx = existingBackupTxItems[0];
                                existingBackupTx.backupTxs.push(depositResult.backupTx);
                            } else {
                                state.backupTxs.push({
                                    statechain_id: newCoin.statechain_id,
                                    backupTxs: [depositResult.backupTx]
                                });
                            }
                        }

                    }
                }
            }



            // wallet.coins.push(action.payload.coin);
        })
    }
});

export const walletActions = walletSlice.actions;

export default walletSlice.reducer;