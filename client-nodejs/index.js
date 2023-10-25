const { Command } = require('commander');
const program = new Command();

const mercury_wasm = require('../wasm/pkg/mercury_wasm');

const ElectrumCli = require('@mempool/electrum-client');

const utils = require('./utils');

const sqlite3 = require('sqlite3').verbose();

const sqlite_manager = require('./sqlite_manager');

const wallet_manager = require('./wallet');

async function main() {

  const db = new sqlite3.Database('wallet.db');

  await sqlite_manager.createTable(db);
  
  program
    .name('Statechain nodejs CLI client')
    .description('CLI to test the Statechain nodejs client')
    .version('0.0.1');
  
  program.command('create_wallet')
    .description('Create a new wallet')
    .argument('<name>', 'name of the wallet')
    .action(async (name) => {
      console.log("The name of the wallet is: " + name);
  
      const electrumClient = new ElectrumCli(50001, '127.0.0.1', 'tcp'); // tcp or tls
      await electrumClient.connect(); // connect(promise)

      const electrumEndpoint = "tcp://127.0.0.1:50001";
      const statechainEntityEndpoint = "http://127.0.0.1:8000";
      const network = "signet";

      let wallet = await wallet_manager.createWallet(name, electrumClient, electrumEndpoint, statechainEntityEndpoint, network);
 
      await sqlite_manager.insertWallet(db, wallet);
  
      electrumClient.close();
      db.close();
    });

  program.command('deposit')
    .description('Deposit funds into a statecoin')
    .argument('<wallet_name>', 'name of the wallet')
    .argument('<token_id>', 'token id of the deposit')
    .argument('<amount>', 'amount to deposit')
    .action(async (name) => {

      let wallet = await sqlite_manager.getWallet(db, name);

      // let coin = mercury_wasm.getNewCoin(wallet);

      let address_index = mercury_wasm.getBalance(wallet);

      // console.log("coin: " + JSON.stringify(coin));
      console.log("address_index: " + address_index);
    });
  
  
  program.parse();

}

(async () => {
  await main();
})();


