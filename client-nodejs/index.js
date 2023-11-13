const { Command } = require('commander');
const program = new Command();

const mercury_wasm = require('mercury-wasm');

const ElectrumCli = require('@mempool/electrum-client');

const deposit = require('./deposit');
const broadcast_backup_tx = require('./broadcast_backup_tx');
const withdraw = require('./withdraw');
const transfer_receive = require('./transfer_receive');

const sqlite3 = require('sqlite3').verbose();

const sqlite_manager = require('./sqlite_manager');

const wallet_manager = require('./wallet');

async function main() {

  const db = new sqlite3.Database('wallet.db');

  await sqlite_manager.createTables(db);
  
  program
    .name('Statechain nodejs CLI client')
    .description('CLI to test the Statechain nodejs client')
    .version('0.0.1');
  
  program.command('create-wallet')
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
    .action(async (wallet_name, token_id, amount) => {

      const electrumClient = new ElectrumCli(50001, '127.0.0.1', 'tcp'); // tcp or tls
      await electrumClient.connect(); // connect(promise)

      await deposit.execute(electrumClient, db, wallet_name, token_id, amount);

      electrumClient.close();
      db.close();
    });

    program.command('broadcast-backup-transaction')
      .description('Broadcast a backup transaction via CPFP') 
      .argument('<wallet_name>', 'name of the wallet')
      .argument('<statechain_id>', 'statechain id of the coin')
      .argument('<to_address>', 'recipient bitcoin address')
      .option('-f, --fee_rate <fee_rate>', '(optional) fee rate in satoshis per byte')
      .action(async (wallet_name, statechain_id, to_address, options) => {

       const electrumClient = new ElectrumCli(50001, '127.0.0.1', 'tcp'); // tcp or tls
       await electrumClient.connect(); // connect(promise)

       await broadcast_backup_tx.execute(electrumClient, db, wallet_name, statechain_id, to_address, options.fee_rate);

       electrumClient.close();
       db.close();
    });

    program.command('list-statecoins')
      .description("List wallet's statecoins") 
      .argument('<wallet_name>', 'name of the wallet')
      .action(async (wallet_name) => {
        const electrumClient = new ElectrumCli(50001, '127.0.0.1', 'tcp'); // tcp or tls
        await electrumClient.connect(); // connect(promise)

        let wallet = await sqlite_manager.getWallet(db, wallet_name);

        for (let coin of wallet.coins) {
          console.log("statechain_id: ", coin.statechain_id);
          console.log("coin.amount: {}", coin.amount);
          console.log("coin.status: {}", coin.status);
        }

        electrumClient.close();
        db.close();

    });

    program.command('withdraw')
      .description('Withdraw funds from a statecoin to a BTC address') 
      .argument('<wallet_name>', 'name of the wallet')
      .argument('<statechain_id>', 'statechain id of the coin')
      .argument('<to_address>', 'recipient bitcoin address')
      .option('-f, --fee_rate <fee_rate>', '(optional) fee rate in satoshis per byte')
      .action(async (wallet_name, statechain_id, to_address, options) => {

        const electrumClient = new ElectrumCli(50001, '127.0.0.1', 'tcp'); // tcp or tls
        await electrumClient.connect(); // connect(promise)

        await withdraw.execute(electrumClient, db, wallet_name, statechain_id, to_address, options.fee_rate);

        electrumClient.close();
        db.close();
      });

    program.command('new-transfer-address')
    .description('New transfer address for a statecoin') 
    .argument('<wallet_name>', 'name of the wallet')
    .action(async (wallet_name) => {

      const addr = await transfer_receive.newTransferAddress(db, wallet_name)
      console.log({transfer_receive: addr});

      db.close();
    });
  
  
  program.parse();

}

(async () => {
  await main();
})();


