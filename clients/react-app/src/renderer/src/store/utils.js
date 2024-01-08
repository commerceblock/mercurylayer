
// const updateCoin = (newCoin, wallet) => {

//     // Step 1: Filter coins with the same statechain_id
//     const filteredCoins = wallet.coins.filter(coin =>
//         coin.statechain_id === newCoin.statechain_id
//     );

//     console.log("filteredCoins", filteredCoins);

//     // Step 2: Find the coin with the highest locktime
//     const coinToUpdate = filteredCoins.reduce((max, coin) => 
//         (max.locktime > coin.locktime) ? max : coin
//     );

//     console.log("coinToUpdate", coinToUpdate);

//     // Step 3: Update the coin
//     const updatedCoins = wallet.coins.map(coin =>
//         (coin === coinToUpdate) ? newCoin : coin
//     );

//     console.log("updatedCoins", updatedCoins);

//     wallet.coins = updatedCoins;

//     console.log("wallet.coins", wallet.coins);
// };

/*
let indexWithHighestTxN = wallet.coins.reduce((highestIndex, current, currentIndex) => {
    if (current.statechain_id === coin.statechain_id) {
        if (highestIndex === -1 || current.tx_n > wallet.coins[highestIndex].tx_n) {
            return currentIndex;
        }
    }
    return highestIndex;
}, -1);
*/

const updateCoin = (newCoin, wallet) => {

    let indexWithLowestTxN = wallet.coins.reduce((highestIndex, current, currentIndex) => {
        if (current.statechain_id === newCoin.statechain_id) {
            if (highestIndex === -1 || current.locktime < wallet.coins[highestIndex].locktime) {
                return currentIndex;
            }
        }
        return highestIndex;
    }, -1);

    console.log("indexWithHighestTxN", indexWithLowestTxN);

    if (indexWithLowestTxN != -1) {
        //throw new Error(`There is no coin with the statechain id ${newCoin.statechain_id}`);
        wallet.coins[indexWithLowestTxN] = newCoin;
    }
}

const updateCoinByPublicKey= (newCoin, wallet) => {

    // Step 1: Filter coins with the same statechain_id
    const filteredCoins = wallet.coins.filter(coin =>
        coin.user_pubkey === newCoin.user_pubkey
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

/** When the user receives a valid statecoin, all the backup transactions related to that coin is also sent.
 * The user should use an empty SE addess to receive a new coin, so it is exepected that the backup transactions
 * are empty. This function replaces the empty backup transactions with the received backup transactions for the
 * case when the user uses a non-empty statecoin (something that should not be done).
 */
const replaceBackupTxs = (state, coin, newBackupTxs) => {
    let existingBackupTxItems = state.backupTxs.filter(b => b.statechain_id === coin.statechain_id);

    if (existingBackupTxItems.length > 0) {
        let existingBackupTx = existingBackupTxItems[0];
        existingBackupTx.backupTxs= newBackupTxs;
    } else {
        state.backupTxs.push({
            statechain_id: coin.statechain_id,
            backupTxs: newBackupTxs
        });
    }
};

export default { updateCoin, insertNewBackupTx, updateCoinByPublicKey, replaceBackupTxs };