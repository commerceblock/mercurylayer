import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  encrypted_wallets: []
}

const encryptedWalletSlice = createSlice({
  name: 'encryptedWallets',
  initialState,
  reducers: {
    loadWallets(state, action) {
      state.encrypted_wallets = action.payload
    }
  }
})

export const encryptedWalletActions = encryptedWalletSlice.actions

export default encryptedWalletSlice.reducer
