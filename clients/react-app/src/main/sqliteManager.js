const run = (db, sql, params) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, (err) => {
        if (err) {
            reject(err);
        } else {
            resolve();
        }
        });
    });
};

const createTables = async (db) => {
    await run(db, "CREATE TABLE IF NOT EXISTS wallet (wallet_name TEXT NOT NULL UNIQUE, wallet_json TEXT NOT NULL)", []);
    await run(db, "CREATE TABLE IF NOT EXISTS backup_txs (statechain_id TEXT NOT NULL, wallet_name TEXT NOT NULL, txs TEXT NOT NULL)", []);
}

const upsertWallet = async (db, wallet) => {
    await run(db, "INSERT INTO wallet (wallet_name, wallet_json) VALUES (?, ?) ON CONFLICT(wallet_name) DO UPDATE SET wallet_json = ?", [ wallet.name, JSON.stringify(wallet), JSON.stringify(wallet) ]);
}

const getWallet  = async (db, walletName) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT wallet_json FROM wallet WHERE wallet_name = ?", [ walletName ], (err, row) => {
            if (err) {
                reject(err);
            } else {
                let wallet = JSON.parse(row.wallet_json);
                resolve(wallet);
            }
        });
    });
}

const getWallets  = async (db) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT wallet_json FROM wallet", [], (err, rows) => {
            if (err) {
                reject(err);
            } else {

                let wallets = [];
                
                for (let i = 0; i < rows.length; i++) {
                    let wallet = JSON.parse(rows[i].wallet_json);
                    wallets.push(wallet);
                }

                resolve(wallets);
            }
        });
    });
}

const syncBackupTransactions = async (db, statechain_id, walletName, txs) => {
    // await run(db, "BEGIN TRANSACTION;");
    await run(db, "DELETE FROM backup_txs WHERE statechain_id = ? AND wallet_name = ?", [ statechain_id, walletName]); 
    await run(db, "INSERT INTO backup_txs (statechain_id, wallet_name, txs) VALUES (?, ?, ?)", [ statechain_id, walletName, JSON.stringify(txs) ]);
    // await run(db, "COMMIT;");
}

const getAllBackupTxs  = async (db) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT statechain_id, wallet_name, txs FROM backup_txs", [], (err, rows) => {
            if (err) {
                reject(err);
            } else {

                let backupTxs = [];

                for (let i = 0; i < rows.length; i++) {
                    backupTxs.push({
                        statechain_id: rows[i].statechain_id,
                        walletName: rows[i].wallet_name,
                        backupTxs: JSON.parse(rows[i].txs)
                    });
                }

                resolve(backupTxs);
            }
        });
    });
}

export default { 
    createTables, 
    upsertWallet, 
    getWallet, 
    getWallets, 
    getAllBackupTxs ,
    syncBackupTransactions
};