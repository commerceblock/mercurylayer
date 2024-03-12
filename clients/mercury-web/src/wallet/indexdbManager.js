// Open a database connection
const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open("myDatabase", 1);

    request.onerror = (event) => {
      reject("Database error: " + event.target.errorCode);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore("wallets", { keyPath: "wallet_name" });
      db.createObjectStore("backup_txs", { keyPath: "statechain_id" });
    };
  });
};

// Helper function to perform database operations
const runTransaction = (db, storeName, method, data) => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store[method](data);

    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) =>
      reject("Transaction error: " + event.target.error);
  });
};

// CRUD operations for 'wallets' object store
const upsertWallet = async (wallet) => {
  const db = await openDatabase();
  await runTransaction(db, "wallets", "put", wallet);
};

const getWallet = async (walletName) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("wallets");
    const store = transaction.objectStore("wallets");
    const request = store.get(walletName);

    request.onsuccess = (event) => {
      const wallet = event.target.result;
      if (wallet) {
        resolve(wallet);
      } else {
        reject("Wallet not found");
      }
    };

    request.onerror = (event) =>
      reject("Error getting wallet: " + event.target.error);
  });
};

// CRUD operations for 'backup_txs' object store
const syncBackupTransactions = async (statechain_id, walletName, txs) => {
  const db = await openDatabase();
  await runTransaction(db, "backup_txs", "put", {
    statechain_id,
    walletName,
    txs,
  });
};

const getAllBackupTxs = async () => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("backup_txs");
    const store = transaction.objectStore("backup_txs");
    const request = store.getAll();

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) =>
      reject("Error getting backup transactions: " + event.target.error);
  });
};

// Example usage
/*
async function exampleUsage() {
  try {
    await upsertWallet({
      wallet_name: "myWallet",
      wallet_json: { balance: 100 },
    });
    const wallet = await getWallet("myWallet");
    console.log("Retrieved wallet:", wallet);

    await syncBackupTransactions("abc123", "myWallet", [
      { id: 1, amount: 50 },
      { id: 2, amount: 75 },
    ]);
    const backupTxs = await getAllBackupTxs();
    console.log("All backup transactions:", backupTxs);
  } catch (error) {
    console.error("Error:", error);
  }
}

exampleUsage();*/
