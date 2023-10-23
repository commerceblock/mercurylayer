CREATE TABLE IF NOT EXISTS wallet (
    wallet_name TEXT UNIQUE,
    wallet_json BLOB NOT NULL
);
