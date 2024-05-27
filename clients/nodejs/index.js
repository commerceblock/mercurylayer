const { Command } = require('commander');
const program = new Command();

const ml_lib = require('./ml_lib');
const client_config = require('./client_config');

async function main() {

  const clientConfig = client_config.load();
  
  program
    .name('Statechain nodejs CLI client')
    .description('CLI to test the Statechain nodejs client')
    .version('0.0.1');
  
  program.command('create-wallet')
    .description('Create a new wallet')
    .argument('<name>', 'name of the wallet')
    .action(async (name) => {

      await ml_lib.createWallet(clientConfig, name);

      console.log(JSON.stringify(
        {
          result: `Wallet ${name} has been created successfully.`
        }, null, 2));

    });

    program.command('new-token')
    .description('Get new token.')
    .argument('<wallet_name>', 'name of the wallet')
    .action(async (wallet_name) => {

      const token = await ml_lib.newToken(clientConfig, wallet_name);
      console.log(JSON.stringify(token, null, 2));

    });

    program.command('list-tokens')
      .description("List wallet's tokens") 
      .argument('<wallet_name>', 'name of the wallet')
      .action(async (wallet_name) => {
    
        let wallet = await ml_lib.getWalletTokens(clientConfig, wallet_name);

        console.log(JSON.stringify(wallet.tokens, null, 2));

    });

    program.command('new-deposit-address')
    .description('Get new deposit address. Used to fund a new statecoin.')
    .argument('<wallet_name>', 'name of the wallet')
    .argument('<amount>', 'amount to deposit')
    .action(async (wallet_name, amount) => {

      const address_info = await ml_lib.getDepositBitcoinAddress(clientConfig, wallet_name, amount);

      console.log(JSON.stringify(address_info, null, 2));
    });

    program.command('broadcast-backup-transaction')
      .description('Broadcast a backup transaction via CPFP') 
      .argument('<wallet_name>', 'name of the wallet')
      .argument('<statechain_id>', 'statechain id of the coin')
      .argument('<to_address>', 'recipient bitcoin address')
      .option('-f, --fee_rate <fee_rate>', '(optional) fee rate in satoshis per byte')
      .action(async (wallet_name, statechain_id, to_address, options) => {

       let tx_ids = await ml_lib.broadcastBackupTransaction(clientConfig, wallet_name, statechain_id, to_address, options);

       console.log(JSON.stringify(tx_ids, null, 2));
    });

    program.command('list-statecoins')
      .description("List wallet's statecoins") 
      .argument('<wallet_name>', 'name of the wallet')
      .action(async (wallet_name) => {

        let coins = await ml_lib.listStatecoins(clientConfig, wallet_name);
        
        console.log(JSON.stringify(coins, null, 2));
    });

    program.command('withdraw')
      .description('Withdraw funds from a statecoin to a BTC address') 
      .argument('<wallet_name>', 'name of the wallet')
      .argument('<statechain_id>', 'statechain id of the coin')
      .argument('<to_address>', 'recipient bitcoin address')
      .option('-f, --fee_rate <fee_rate>', '(optional) fee rate in satoshis per byte')
      .action(async (wallet_name, statechain_id, to_address, options) => {

        const txid = await ml_lib.withdrawCoin(clientConfig, wallet_name, statechain_id, to_address, options);

        console.log(JSON.stringify({
          txid
        }, null, 2));
      });

    program.command('new-transfer-address')
      .description('New transfer address for a statecoin') 
      .argument('<wallet_name>', 'name of the wallet')
      .option('-b, --generate-batch-id', 'optional batch id for the transaction')
      .action(async (wallet_name, options) => {

        let res = await ml_lib.newTransferAddress(clientConfig, wallet_name, options);

        console.log(JSON.stringify(res, null, 2));
    });

    program.command('transfer-send')
      .description('Send the specified statecoin to an SC address') 
      .argument('<wallet_name>', 'name of the wallet')
      .argument('<statechain_id>', 'statechain id of the coin')
      .argument('<to_address>', 'recipient bitcoin address')
      .option('-b, --batch-id <batch_id>', 'optional batch id for the transaction')
      .action(async (wallet_name, statechain_id, to_address, options) => {

        await ml_lib.transferSend(clientConfig, wallet_name, statechain_id, to_address, options);

        console.log(JSON.stringify({
          "result": "Coin has been sent successfully."
        }, null, 2));
      });

    program.command('transfer-receive')
      .description('Retrieve coins from server') 
      .argument('<wallet_name>', 'name of the wallet')
      .action(async (wallet_name) => {

        let received_statechain_ids = await ml_lib.transferReceive(clientConfig, wallet_name);

        console.log(JSON.stringify(received_statechain_ids, null, 2));
    });
  
  program.parse();

}

(async () => {
  await main();
})();


