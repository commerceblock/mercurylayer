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

export default { updateCoin };