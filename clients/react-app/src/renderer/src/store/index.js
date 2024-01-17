import { configureStore } from '@reduxjs/toolkit';
import walletReducer from './wallet';
import wizardReducer from './wizard';

const store = configureStore({
    reducer: {
        wallet: walletReducer,
        wizard: wizardReducer
    }
});

export default store;