import { createAsyncThunk } from '@reduxjs/toolkit'
import wallet_manager from './../logic/walletManager';
import deposit from './../logic/deposit';

const createWallet = createAsyncThunk(
    'wallet/create',
    async (name, thunkAPI) => {
        return wallet_manager.createWallet(name);
    }
);

const newDepositAddress = createAsyncThunk(
    'wallet/new_deposit_address',
    async (payout, thunkAPI) => {
        return deposit.newAddress(payout.wallet, payout.amount);
    }
);

export default { createWallet, newDepositAddress };