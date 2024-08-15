import axios from 'axios';
const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);

const generateBlocks = async (blocks) => {
    const body = {
        blocks
    };

    const url = `http://0.0.0.0:3000/generate_blocks`;

    let response = await axios.post(url, body);

    if (response.status != 200) {
        throw new Error(`Failed to generate new blocks`);
    }
}

const depositCoin = async (address, amount) => {

    const body = {
        address,
        amount
    };

    const url = `http://0.0.0.0:3000/deposit_amount`;
    
    let response = await axios.post(url, body);

    if (response.status != 200) {
        throw new Error(`Failed to unlock transfer message`);
    }
} 

const testEsplora = async () => {

    const response = await axios.get(`${clientConfig.esploraServer}/api/blocks/tip/height`);
    const block_header = response.data;
    console.log(block_header);
}

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const generateInvoice = async (paymentHash, amountInSats) => {

    const generateInvoiceCommand = `docker exec $(docker ps -qf "name=mercurylayer-alice-1") lncli -n regtest addholdinvoice ${paymentHash} --amt ${amountInSats}`;
    const { stdout, stderr } = await exec(generateInvoiceCommand);
    if (stderr) {
        console.error('Error:', stderr);
        return null;
    }
    
    try {
        const response = JSON.parse(stdout.trim());
        return response;
    } catch (error) {
        console.error('Error parsing JSON:', error);
        return null;
    }
}

const payInvoice = async (paymentRequest) => {
    
    const payInvoiceCommand = `docker exec $(docker ps -qf "name=mercurylayer-bob-1") lncli -n regtest payinvoice --force ${paymentRequest}`;
    const { stdout, stderr } = await exec(payInvoiceCommand);
    if (stderr) {
      console.error('Error:', stderr);
      return null;
    }
    console.log('stdout:', stdout.trim());
    return stdout.trim();
}

const payHoldInvoice = (paymentRequest) => {
    
    const payInvoiceCommand = `docker exec $(docker ps -qf "name=mercurylayer-bob-1") lncli -n regtest payinvoice --force ${paymentRequest}`;
    exec(payInvoiceCommand);
}

const settleInvoice = async (preimage) => {

    const settleInvoiceCommand = `docker exec $(docker ps -qf "name=mercurylayer-alice-1") lncli -n regtest settleinvoice ${preimage}`;
    await exec(settleInvoiceCommand);
}

export { generateBlocks, depositCoin, sleep, generateInvoice, payInvoice, payHoldInvoice, settleInvoice };
