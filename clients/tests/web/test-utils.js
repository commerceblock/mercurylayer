import axios from 'axios';

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

export { generateBlocks, depositCoin, sleep };
