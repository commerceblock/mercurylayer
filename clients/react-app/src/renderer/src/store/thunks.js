import { createAsyncThunk } from '@reduxjs/toolkit'
import wallet_manager from './../logic/walletManager';

const createWallet = createAsyncThunk(
    'wallet/create',
    async (name, thunkAPI) => {
        /* console.log('thunk createWallet', name);
        let wallet = await wallet_manager.createWallet(walletName);
        console.log('2');
        return wallet; */

        let wallet = await wallet_manager.createWallet(name);
        return window.api.insertWallet(wallet);

    }
);

export default { createWallet };