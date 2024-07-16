const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const cors = require('cors')
const port = 3000
const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);

app.use(bodyParser.json())
app.use(cors())

async function depositCoin(amount, address) {

  const amountInBtc = amount / 100000000;

  // Sending Bitcoin using bitcoin-cli

      const sendBitcoinCommand = `docker exec $(docker ps -qf "name=container") cli sendtoaddress ${address} ${amountInBtc}`;
      exec(sendBitcoinCommand);
      // console.log(`Sent ${amountInBtc} BTC to ${deposit_info.deposit_address}`);
      // await generateBlock(3);

}

app.post('/deposit_amount', async (req, res) => {
  const { address, amount } = req.body

  if (typeof address === 'string' && Number.isInteger(amount)) {
    // Process the deposit here
    console.log(`Deposit received: Address - ${address}, Amount - ${amount}`)
    await depositCoin(amount, address)
    res.status(200).send({ message: 'Deposit processed successfully' })
  } else {
    res.status(400).send({ message: 'Invalid input' })
  }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})