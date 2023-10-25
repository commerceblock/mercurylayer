const { Command } = require('commander');
const program = new Command();

const mercury_wasm = require('../wasm/pkg/mercury_wasm');

const ElectrumCli = require('@mempool/electrum-client');

const utils = require('./utils');

const sqlite3 = require('sqlite3').verbose();

const sqlite_manager = require('./sqlite_manager');

async function main() {

  const db = new sqlite3.Database('wallet.db');

  sqlite_manager.createTable(db);
  
  program
    .name('Statechain nodejs CLI client')
    .description('CLI to test the Statechain nodejs client')
    .version('0.0.1');
  
  program.command('create_wallet')
    .description('Create a new wallet')
    .argument('<name>', 'name of the wallet')
    .action(async (name) => {
      console.log("The name of the wallet is: " + name);
  
      const ecl = new ElectrumCli(50001, '127.0.0.1', 'tcp'); // tcp or tls
      await ecl.connect(); // connect(promise)
      let block_header = await ecl.request('blockchain.headers.subscribe'); // request(promise)
      let blockheight = block_header.height;
   
      let server_info = await utils.infoConfig(ecl);
  
      let mnemonic = mercury_wasm.generateMnemonic();
  
      let wallet = {
        name,
        mnemonic,
        version: "0.1.0",
        state_entity_endpoint: "http://127.0.0.1:8000",
        electrum_endpoint: "tcp://127.0.0.1:50001",
        network: "signet",
        blockheight,
        initlock: server_info.initlock,
        interval: server_info.interval,
        tokens: [],
        activity: [],
        coins: []
      };
  
      sqlite_manager.insertWallet(db, wallet);
  
      ecl.close();
      db.close();
    });
  
  
  program.parse();

}

(async () => {
  await main();
})();


