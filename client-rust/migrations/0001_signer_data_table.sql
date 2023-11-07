CREATE TABLE IF NOT EXISTS wallet (
    wallet_name TEXT UNIQUE,
    wallet_json BLOB NOT NULL
);

CREATE TABLE IF NOT EXISTS backup_txs (
    wallet_name TEXT NOT NULL,
    statechain_id TEXT NOT NULL,
    txs TEXT NOT NULL
);
