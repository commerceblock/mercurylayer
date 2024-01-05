import { createAsyncThunk } from '@reduxjs/toolkit'
import wallet_manager from './../logic/walletManager';
import deposit from './../logic/deposit';
import coinStatus from './../logic/coinStatus';

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

const updateCoins = createAsyncThunk(
    'wallet/update_coins',
    async (wallets, thunkAPI) => {
        return coinStatus.updateCoins(wallets);
    }
);

export default { createWallet, newDepositAddress, updateCoins };