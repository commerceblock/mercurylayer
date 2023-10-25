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

const createTable = async (db) => {
    await run(db, "CREATE TABLE IF NOT EXISTS wallet (wallet_name TEXT NOT NULL UNIQUE, wallet_json TEXT NOT NULL)", []);
}

const insertWallet = async (db, wallet) => {
    console.log("wallet 11: " + JSON.stringify(wallet));
    console.log("wallet.name: " + wallet.name);

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
                resolve(row);
            }
        });
    });
}

module.exports = { createTable, insertWallet, updateWallet, getWallet };