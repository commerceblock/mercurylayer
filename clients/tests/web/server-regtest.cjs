const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const cors = require('cors')
const port = 3000
const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);

app.use(bodyParser.json())
app.use(cors())

async function getnewaddress() {
  const generateBlockCommand = `docker exec $(docker ps -qf "name=esplora-container") cli getnewaddress`;
  const { stdout, stderr } = await exec(generateBlockCommand);
  if (stderr) {
    throw new Error(`Error: ${stderr}`);
  }
  return stdout.trim();
}

async function generateBlocks(numBlocks) {
  const address = await getnewaddress();
  const generateBlockCommand = `docker exec $(docker ps -qf "name=esplora-container") cli generatetoaddress ${numBlocks} ${address}`;
  await exec(generateBlockCommand);
}

async function depositCoin(amount, address) {
  const amountInBtc = amount / 100000000;
  const sendBitcoinCommand = `docker exec $(docker ps -qf "name=esplora-container") cli sendtoaddress ${address} ${amountInBtc}`;
  await exec(sendBitcoinCommand);
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

app.post('/generate_blocks', async (req, res) => {
  const { blocks } = req.body

  if (Number.isInteger(blocks)) {
    // Process the deposit here
    console.log(`Generating ${blocks} blocks ...`)
    
    try {
      await generateBlocks(blocks);
    } catch (error) {
      console.log(error.message);
      res.status(500).send({ message: error.message })
    } 
    
    res.status(200).send({ message: 'Blocks generated successfully' })
  } else {
    res.status(400).send({ message: 'Invalid input' })
  }
})

app.listen(port, () => {
  console.log(`Docker server listening on port ${port}`)
})