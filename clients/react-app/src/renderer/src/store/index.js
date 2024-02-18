import { configureStore } from '@reduxjs/toolkit'
import walletReducer from './wallet'
import wizardReducer from './wizard'
import depositReducer from './deposit'
import encryptedWalletsReducer from './encryptedWallets'

const store = configureStore({
  reducer: {
    wallet: walletReducer,
    wizard: wizardReducer,
    deposit: depositReducer,
    encryptedWallets: encryptedWalletsReducer
  }
})

export default store
