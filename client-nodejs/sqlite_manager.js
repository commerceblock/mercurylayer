const createTable = (db) => {
    db.run("CREATE TABLE IF NOT EXISTS wallet (wallet_name TEXT NOT NULL UNIQUE, wallet_json TEXT NOT NULL)");
}

const insertWallet = (db, wallet) => {
    db.run("INSERT INTO wallet (wallet_name, wallet_json) VALUES (?, ?)", [ wallet.name, JSON.stringify(wallet) ]);
}

  module.exports = { createTable, insertWallet };