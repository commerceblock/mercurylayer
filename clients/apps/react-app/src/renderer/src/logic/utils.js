const createActivity = (utxo, amount, action) => {
  const activity = {
    utxo,
    amount,
    action,
    date: new Date().toISOString()
  }

  return activity
}

// Function to convert satoshis to BTC format
const convertSatoshisToBTC = (satoshis) => {
  const btcAmount = satoshis / 100000000 // 1 BTC = 100,000,000 satoshis
  return btcAmount.toFixed(3) // Format to 3 decimal places
}

export default { createActivity, convertSatoshisToBTC }
