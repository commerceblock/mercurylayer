# Mercury Layer Client

Mercury layer client provides a user interface to the Mercury Layer protocol, via the Mercury Layer server. 

# Running

1. Run the `server` project on localhost
2. Run one of the commands below

# Some commands

`cargo run show-mnemonic` shows wallet mnemonic

`cargo run deposit <token-id> <amount>` creates a new statechain coin

`cargo run get-balance` shows wallet balance

`cargo run broadcast-backup-transaction <statechain-id>` broadcasts the backup transaction to the network

`cargo run send-backup <btc-address>` send all backup funds to the address provided

`cargo run new-transfer-address` generates a transfer address to receive statechain coins

This is a work in progress. Several changes to the project are expected.