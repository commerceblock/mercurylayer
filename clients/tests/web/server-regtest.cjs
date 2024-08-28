const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const cors = require('cors')
const port = 3000
const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);
const lightningPayReq = require('bolt11');

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

const generateInvoice = async (paymentHash, amountInSats) => {
  const generateInvoiceCommand = `docker exec $(docker ps -qf "name=mercurylayer-alice-1") lncli -n regtest addholdinvoice ${paymentHash} --amt ${amountInSats}`;

  const { stdout, stderr } = await exec(generateInvoiceCommand);
  if (stderr) {
      console.error('Error:', stderr);
      return null;
  }
  return stdout.trim();
}

const payInvoice = async (paymentRequest) => {
  const payInvoiceCommand = `docker exec $(docker ps -qf "name=mercurylayer-bob-1") lncli -n regtest payinvoice --force ${paymentRequest}`;
  await exec(payInvoiceCommand);
}

const payHoldInvoice = (paymentRequest) => {
  const payInvoiceCommand = `docker exec $(docker ps -qf "name=mercurylayer-bob-1") lncli -n regtest payinvoice --force ${paymentRequest}`;
  exec(payInvoiceCommand);
}

const settleInvoice = async (preimage) => {
  const settleInvoiceCommand = `docker exec $(docker ps -qf "name=mercurylayer-alice-1") lncli -n regtest settleinvoice ${preimage}`;
  await exec(settleInvoiceCommand);
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

app.post('/generate_invoice', async (req, res) => {
  const { paymentHash, amountInSats } = req.body

  if (typeof paymentHash === 'string' && Number.isInteger(amountInSats)) {
    console.log(`Generating invoice ...`)
    
    try {
      const invoice = await generateInvoice(paymentHash, amountInSats);
      res.status(200).send({ message: 'Invoice generated successfully', invoice })
    } catch (error) {
      console.log(error.message);
      res.status(500).send({ message: error.message })
    } 
    
  } else {
    res.status(400).send({ message: 'Invalid input' })
  }
})

app.post('/pay_invoice', async (req, res) => {
  const { paymentRequest } = req.body

  if (typeof paymentRequest === 'string') {
    console.log(`Paying invoice ...`)
    
    try {
      await payInvoice(paymentRequest);
    } catch (error) {
      console.log(error.message);
      res.status(500).send({ message: error.message })
    } 
    
    res.status(200).send({ message: 'Invoice paid successfully' })
  } else {
    res.status(400).send({ message: 'Invalid input' })
  }
})

app.post('/pay_holdinvoice', async (req, res) => {
  const { paymentRequest } = req.body

  if (typeof paymentRequest === 'string') {
    console.log(`Paying invoice ...`)
    
    try {
      payHoldInvoice(paymentRequest);
    } catch (error) {
      console.log(error.message);
      res.status(500).send({ message: error.message })
    } 
    
    res.status(200).send({ message: 'Invoice paid successfully' })
  } else {
    res.status(400).send({ message: 'Invalid input' })
  }
})

app.post('/settle_invoice', async (req, res) => {
  const { preimage } = req.body

  if (typeof preimage === 'string') {
    console.log(`Settling invoice ...`)
    
    try {
      await settleInvoice(preimage);
    } catch (error) {
      console.log(error.message);
      res.status(500).send({ message: error.message })
    } 
    
    res.status(200).send({ message: 'Invoice settled successfully' })
  } else {
    res.status(400).send({ message: 'Invalid input' })
  }
})

app.post('/decode_invoice', async (req, res) => {
  const { paymentRequest } = req.body

  if (typeof paymentRequest === 'string') {
    console.log(`Decoding invoice ...`)
    
    try {
      const invoice = lightningPayReq.decode(paymentRequest);
      res.status(200).send({ message: 'Invoice generated successfully', invoice })
    } catch (error) {
      console.log(error.message);
      res.status(500).send({ message: error.message })
    } 
    
  } else {
    res.status(400).send({ message: 'Invalid input' })
  }
})

app.listen(port, () => {
  console.log(`Docker server listening on port ${port}`)
})