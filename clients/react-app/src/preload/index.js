import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  electrumRequest: (payout) => ipcRenderer.invoke('electrum-request', payout),
  infoConfig: () => ipcRenderer.invoke('info-config'),
  getConfigFile: () => ipcRenderer.invoke('get-config-file'),
  syncWallets: async (payout) => await ipcRenderer.invoke('sync-wallets', payout),
  syncEncryptedWallets: async (payout) =>
    await ipcRenderer.invoke('sync-encrypted-wallets', payout),
  getWallets: () => ipcRenderer.invoke('get-wallets'),
  getEncryptedWallets: () => ipcRenderer.invoke('get-encrypted-wallets'),
  selectBackupFile: () => ipcRenderer.invoke('select-backup-file'),
  getToken: () => ipcRenderer.invoke('get-token'),
  initPod: (payout) => ipcRenderer.invoke('init-pod', payout),
  getRealToken: (walletSettings) => ipcRenderer.invoke('get-real-token', walletSettings),
  checkToken: async (payout, walletSettings) =>
    await ipcRenderer.invoke('check-token', payout, walletSettings),
  confirmDebugToken: async (payout, walletSettings) =>
    await ipcRenderer.invoke('confirm-debug-token', payout, walletSettings),
  signFirst: (payout) => ipcRenderer.invoke('sign-first', payout),
  signSecond: (payout) => ipcRenderer.invoke('sign-second', payout),
  convertAddressToReversedHash: (payout) =>
    ipcRenderer.invoke('convert-address-to-reversed-hash', payout),
  syncBackupTxs: async (payout) => await ipcRenderer.invoke('sync-backup-txs', payout),
  getAllBackupTxs: () => ipcRenderer.invoke('get-all-backup-txs'),
  getNewX1: (payout) => ipcRenderer.invoke('get-new-x1', payout),
  updateMsg: (payout) => ipcRenderer.invoke('update-msg', payout),
  sendTransferReceiverRequestPayload: (payout) =>
    ipcRenderer.invoke('send-transfer-receiver-request-payload', payout),
  getStatechainInfo: (payout, walletSettings) =>
    ipcRenderer.invoke('get-statechain-info', payout, walletSettings),
  getMsgAddr: (payout) => ipcRenderer.invoke('get-msg-addr', payout),
  checkTransfer: (payout, walletSettings) =>
    ipcRenderer.invoke('check-transfer', payout, walletSettings)
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
