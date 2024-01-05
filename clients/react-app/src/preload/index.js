import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  electrumRequest: (payout) => ipcRenderer.invoke('electrum-request', payout),
  infoConfig: () => ipcRenderer.invoke('info-config'),
  getConfigFile: () => ipcRenderer.invoke('get-config-file'),
  insertWallet: async (payout) => await ipcRenderer.invoke('insert-wallet', payout)
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
