import { configureStore } from '@reduxjs/toolkit';
import walletReducer from './wallet';
import wizardReducer from './wizard';
import depositReducer from './deposit';

const store = configureStore({
    reducer: {
        wallet: walletReducer,
        wizard: wizardReducer,
        deposit: depositReducer
    }
});

export default store;