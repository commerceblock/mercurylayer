# Mercury Layer CL Kotlin client

## Command-line arguments:

### Create Wallet
`create-wallet <wallet-name>`

Example: `create-wallet w1`

### New Deposit Address
`new-deposit-address <wallet-name> <amount>`

Example: `new-deposit-address w1 1000`

### List Statecoins

`list-statecoins <wallet-name>`

Example: `list-statecoins w1`

### New Statechain Adress

`new-transfer-address <wallet-name>`

Example: `new-transfer-address w2`

### Send a Statecoin

`new-transfer-address <wallet-name> <statechain-id> <recipient-statechain-address>`

Example: `transfer-send w1 2dd78ce438a1450083996fa7f37a02d0 tml1qqp3sp8pu0v38d9krdekckuy4qnueqtnlq8radjwf5rvvgkdnm4y03szgljuxjweppkyymh44wr034avmut5w83xcaey83pp7nqqxqcnyldsa3jpyr`

### Receive a Statecoin

`transfer-receive <wallet-name>`

Example: `transfer-receive w2`

### Withdraw a Statecoin to a Bitcoin Address

`withdraw <wallet-name> <statechain-id> <btc-address> <optional_fee_rate>`

Example: `withdraw w1 453351464f6a4b0ab8401826576c69be tb1qw2hfzv5qzxtmzatjxn5600k9yqnhhddeu6npu5`

### Broadcast Basckup Transaction to a Bitcoin Address

`broadcast-backup-transaction <wallet-name> <statechain-id> <btc-address> <optional_fee_rate>`

Example: `broadcast-backup-transaction w1 e82e423298ca4c7bb7e37771b4dc3e8a tb1qw2hfzv5qzxtmzatjxn5600k9yqnhhddeu6npu5`