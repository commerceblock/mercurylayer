import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import installExtension, { REDUX_DEVTOOLS } from 'electron-devtools-installer';

import config from 'config';
import sqlite3 from 'sqlite3';
import { electrumRequest, disconnectElectrumClient } from './electrumClient';
import { infoConfig, getConfigFile, convertAddressToReversedHash } from './utils';
import sqliteManager from './sqliteManager';
import deposit from './deposit';
import transaction from './transaction';
import transferSend from './transferSend';
import transferReceive from './transferReceive';
import coinStatus from './coinStatus';

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {

  installExtension(REDUX_DEVTOOLS)
        .then((name) => console.log(`Added Extension:  ${name}`))
        .catch((err) => console.log('An error occurred: ', err));

  let db;

  try {
    // where to put that code?
    const databaseFile = config.get('databaseFile');
    db = new sqlite3.Database(databaseFile);
    await sqliteManager.createTables(db);
  } catch (error) {
    console.log("Error:", error);
  }

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('electrum-request', async (event, payout) => {
    const webContents = event.sender

    return await electrumRequest(payout.method, payout.params);
  })

  ipcMain.handle('info-config' , async (event) => {
    return await infoConfig();
  })

  ipcMain.handle('get-config-file' , async (event) => {
    return getConfigFile();
  })

  ipcMain.handle('sync-wallets' , async (event, wallets) => {
    for (let i = 0; i < wallets.length; i++) {
      await sqliteManager.upsertWallet(db, wallets[i]);
    }
  })

  ipcMain.handle('get-wallets', async (event) => {
    let wallets = await sqliteManager.getWallets(db);
    return wallets;
  })

  ipcMain.handle('get-token', async (event) => {
    let token = await deposit.getToken();
    return token;
  })

  ipcMain.handle('init-pod', async (event, depositMsg1) => {
    let depositMsg1Response = await deposit.initPod(depositMsg1);
    return depositMsg1Response;
  })
  
  ipcMain.handle('sign-first', async (event, payout) => {
    let res = await transaction.signFirst(payout);
    return res;
  })

  ipcMain.handle('sign-second', async (event, payout) => {
    let res = await transaction.signSecond(payout);
    return res;
  })

  ipcMain.handle('convert-address-to-reversed-hash', async (event, payout) => {
    return convertAddressToReversedHash(payout.address, payout.network);
  })

  ipcMain.handle('sync-backup-txs', async (event, backupTxs) => {
    console.log('sync-backup-txs', backupTxs);
    for (let i = 0; i < backupTxs.length; i++) {
      // await sqliteManager.upsertTransaction(db, backupTxs[i].statechain_id, backupTxs[i].backupTxs);
      await sqliteManager.syncBackupTransactions(db, backupTxs[i].statechain_id, backupTxs[i].walletName, backupTxs[i].backupTxs);
    }
  })

  ipcMain.handle('get-all-backup-txs', async (event) => {
    let backupTxs = await sqliteManager.getAllBackupTxs(db);
    return backupTxs;
  })

  ipcMain.handle('get-new-x1', async (event, payout) => {
    return await transferSend.getNewX1(payout.statechain_id, payout.signed_statechain_id, payout.new_auth_pubkey);
  })

  ipcMain.handle('update-msg', async (event, payout) => {
    return await transferSend.updateMsg(payout);
  })

  ipcMain.handle('send-transfer-receiver-request-payload', async (event, payout) => {
    return await transferReceive.sendTransferReceiverRequestPayload(payout);
  })

  ipcMain.handle('get-statechain-info', async (event, statechainId) => {
    return await transferReceive.getStatechainInfo(statechainId);
  })
  
  ipcMain.handle('get-msg-addr', async (event, authPubkey) => {
    return await transferReceive.getMsgAddr(authPubkey);
  })

  ipcMain.handle('check-transfer', async (event, statechainId) => {
    return await coinStatus.checkTransfer(statechainId);
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  disconnectElectrumClient();
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
