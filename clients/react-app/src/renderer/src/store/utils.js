const updateCoin = (newCoin, wallet) => {

    // Step 1: Filter coins with the same statechain_id
    const filteredCoins = wallet.coins.filter(coin =>
        coin.statechain_id === newCoin.statechain_id
    );

    // Step 2: Find the coin with the highest locktime
    const coinToUpdate = filteredCoins.reduce((max, coin) => 
        (max.locktime > coin.locktime) ? max : coin
    );

    // Step 3: Update the coin
    const updatedCoins = wallet.coins.map(coin =>
        (coin === coinToUpdate) ? newCoin : coin
    );

    wallet.coins = updatedCoins;
};

const insertNewBackupTx = (state, coin, newBackupTx) => {
    let existingBackupTxItems = state.backupTxs.filter(b => b.statechain_id === coin.statechain_id);

    if (existingBackupTxItems.length > 0) {
        let existingBackupTx = existingBackupTxItems[0];
        existingBackupTx.backupTxs.push(newBackupTx);
    } else {
        state.backupTxs.push({
            statechain_id: coin.statechain_id,
            backupTxs: [newBackupTx]
        });
    }
};

export default { updateCoin, insertNewBackupTx };