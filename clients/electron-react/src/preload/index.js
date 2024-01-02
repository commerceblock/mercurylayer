import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getToken: () => ipcRenderer.invoke('get-token'),
  getDepositAddressInfo: (payout) => ipcRenderer.invoke('get-deposit-address-info', payout),
  createWallet: (walletName) => ipcRenderer.invoke('create-wallet', walletName),
  getWallets: () => ipcRenderer.invoke('get-wallets'),
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
