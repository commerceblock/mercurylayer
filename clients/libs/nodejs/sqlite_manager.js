// Promisify the db.run method
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
    await run(db, "CREATE TABLE IF NOT EXISTS backup_txs (statechain_id TEXT NOT NULL, txs TEXT NOT NULL)", []);
}

const insertWallet = async (db, wallet) => {
    await run(db, "INSERT INTO wallet (wallet_name, wallet_json) VALUES (?, ?)", [ wallet.name, JSON.stringify(wallet) ]);
}

const updateWallet = async (db, wallet) => {
    await run(db, "UPDATE wallet SET wallet_json = ? WHERE wallet_name = ?", [ JSON.stringify(wallet), wallet.name ]);
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

const insertTransaction = async (db, statechain_id, txs) => {
    await run(db, "INSERT INTO backup_txs (statechain_id, txs) VALUES (?, ?)", [ statechain_id, JSON.stringify(txs) ]); 
}

const updateTransaction = async (db, statechain_id, txs) => {
    await run(db, "UPDATE backup_txs SET txs = ? WHERE statechain_id = ?", [ JSON.stringify(txs), statechain_id ]); 
}

const getBackupTxs  = async (db, statechainId) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT txs FROM backup_txs WHERE statechain_id = ?", [ statechainId ], (err, row) => {
            if (err) {
                reject(err);
            } else {
                let backupTxs = JSON.parse(row.txs);
                resolve(backupTxs);
            }
        });
    });
}

const insertOrUpdateBackupTxs = async (db, statechain_id, txs) => {
    await run(db, "DELETE FROM backup_txs WHERE statechain_id = ?", [ statechain_id]); 
    await run(db, "INSERT INTO backup_txs (statechain_id, txs) VALUES (?, ?)", [ statechain_id, JSON.stringify(txs) ]); 
}

module.exports = { createTables, insertWallet, updateWallet, getWallet, insertTransaction, updateTransaction, getBackupTxs, insertOrUpdateBackupTxs };