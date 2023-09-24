CREATE TABLE IF NOT EXISTS signer_seed (
    seed BLOB NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS signer_data (

    statechain_id TEXT,
    token_id TEXT,

    client_seckey_share BLOB UNIQUE,
    client_pubkey_share BLOB UNIQUE,
    backup_address TEXT,

    amount INT,

    funding_txid TEXT,
    funding_vout INT,

    server_pubkey_share BLOB,
    aggregated_xonly_pubkey BLOB,
    p2tr_agg_address TEXT,

    agg_key_derivation_path TEXT,
    auth_derivation_path TEXT,
    change_index INT,
    address_index INT,

    auth_seckey BLOB UNIQUE,
    auth_pubkey BLOB UNIQUE,

    transfer_address TEXT,
    
    fingerprint TEXT,

    sent_to TEXT,
    
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS backup_transaction (

    tx_n INT,
    statechain_id TEXT,
    client_public_nonce BLOB,
    blinding_factor BLOB,
    backup_tx BLOB,
    recipient_address TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP

);