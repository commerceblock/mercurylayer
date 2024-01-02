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

export { createTables, insertWallet, updateWallet, getWallet, getWallets };