import { promisify } from 'node:util';
import { exec as execCallback } from 'node:child_process';
import mercurynodejslib from 'mercurynodejslib';
import { promises as fs } from 'fs';

const exec = promisify(execCallback);

async function createWallet(clientConfig, walletName) {

    let wallet = await mercurynodejslib.createWallet(clientConfig, walletName);
    return wallet;
  
    // TODO: add more assertions
  }
  

async function removeDatabase(clientConfig) {
    try {
        await fs.unlink(clientConfig.databaseFile);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Error occurred:', error);
        }
        // ENOENT means "No such file or directory", so we ignore this error
    }
}

async function getnewaddress() {
  const generateBlockCommand = `docker exec $(docker ps -qf "name=lnd_docker-bitcoind-1") bitcoin-cli -regtest -rpcuser=user -rpcpassword=pass getnewaddress`;
  const { stdout, stderr } = await exec(generateBlockCommand);
  if (stderr) {
    console.error('Error:', stderr);
    return null;
  }
  return stdout.trim();
}

async function generateBlock(numBlocks, address) {
  const generateBlockCommand = `docker exec $(docker ps -qf "name=lnd_docker-bitcoind-1") bitcoin-cli -regtest -rpcuser=user -rpcpassword=pass generatetoaddress ${numBlocks} ${address}`;
  await exec(generateBlockCommand);
}

async function depositCoin(deposit_address, amountInSats) {
  const amountInBtc = amountInSats / 100000000;

  const sendBitcoinCommand = `docker exec $(docker ps -qf "name=lnd_docker-bitcoind-1") bitcoin-cli -regtest -rpcuser=user -rpcpassword=pass sendtoaddress ${deposit_address} ${amountInBtc}`;
  await exec(sendBitcoinCommand);
}

export { createWallet, removeDatabase, getnewaddress, generateBlock, depositCoin };