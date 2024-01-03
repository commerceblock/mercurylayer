import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import deposit from './deposit.js'
import sqlite3 from 'sqlite3';
import sqlite_manager from './sqlite_manager';
import wallet_manager from './wallet_manager';
import broadcast_backup_tx from './broadcast_backup_tx';
import config from 'config';

import coin_status from './coin_status';
import { connectElectrumClient, disconnectElectrumClient } from './electrumClient';


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

  // this takes time. Move it.
  await connectElectrumClient();

  let db;

  try {
  // where to put that code?
  const databaseFile = config.get('databaseFile');
  db = new sqlite3.Database(databaseFile);
  await sqlite_manager.createTables(db);
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

  ipcMain.handle('create-wallet', async (event, walletName) => {
    const webContents = event.sender
    // const win = BrowserWindow.fromWebContents(webContents)
    // win.setTitle(title)
    console.log('Creating wallet with name:', walletName);

    let wallet = await wallet_manager.createWallet(walletName);
    await sqlite_manager.insertWallet(db, wallet);
    return wallet;
  })

  ipcMain.handle('get-token', async (event) => {
    const webContents = event.sender
    // const win = BrowserWindow.fromWebContents(webContents)
    // win.setTitle(title)
    let token = await deposit.getToken();
    return token;
  })

  ipcMain.handle('get-wallets', async (event) => {
    const webContents = event.sender
    // const win = BrowserWindow.fromWebContents(webContents)
    // win.setTitle(title)
    let wallets = await sqlite_manager.getWallets(db);
    return wallets;
  })

  ipcMain.handle('get-deposit-address-info', async (event, payout) => {
    const webContents = event.sender
    // const win = BrowserWindow.fromWebContents(webContents)
    // win.setTitle(title)
    let depositAddressInfo = await deposit.getDepositAddressInfo(db, payout.walletName, payout.amount);
    return depositAddressInfo;
  })

  ipcMain.handle('update-coin-status', async (event) => {
    const webContents = event.sender
    // const win = BrowserWindow.fromWebContents(webContents)
    // win.setTitle(title)
    // let wallets = await sqlite_manager.getWallets(db);
/*     for (let wallet of wallets) {
      for (let coin of wallet.coins) {
        
      }
    }
    return depositAddressInfo; 
    let wallet = wallets[0];

    const network = utils.getNetwork(wallet.network);

    console.log("network:", network);*/

    await coin_status.updateCoins(db);
    let wallets = await sqlite_manager.getWallets(db);
    return wallets;

  })

  ipcMain.handle('broadcast-backup-transaction', async (event, payout) => {
    const webContents = event.sender

    let tx_ids = await broadcast_backup_tx.execute(db, payout.walletName, payout.statechainId, payout.toAddress, payout.feeRate);

    return tx_ids;
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
