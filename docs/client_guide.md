# Mercury layer client guide

The Mercury layer client has implimentations for rust, kotlin and nodejs/web. These instructions describe setting up and using the standalone rust client to send testnet coins on mercurylayer. 

This guide describes the use of the client implimentations to deposit, transfer and withdraw bitcoins via a test enviroment. The clients communicate with the bitcoin network via an Electrum server, where the electrum server type and URL need to be specified in the client config. 

For the purposes of the examples in this guide, a version of the bitcoin signet is used to simulate the main bitcoin network. 


## Rust client

The rust client acts as a standalone command line client for mercury layer that can demonstrate the main wallet operations. The wallet state is saved in a local `sqlite` database. 

Initially, Rust must be installed. To do this on a Linux or MacOS system, simply run:

```
curl https://sh.rustup.rs -sSf | sh
```

To use the standalone client app, first clone the mercurylayer repository:

```
git clone https://github.com/commerceblock/mercurylayer.git
```

Then switch to the `dev` branch:

```
cd mercurylayer
git checkout dev
```

Then change directory to the standalone client:

```
cd /clients/apps/rust
```

In this directory is the `Settings.toml` file for the client. This needs to be edited (using any text editor, e.g. vi or nano) to set the mercury server endpoint and Electrum server URL. 

For the purposes of demonstration, use the following `Settings.toml`: 

```
statechain_entity = "http://test.mercurylayer.com:8500"
electrum_server = "tcp://mutinynet.com:50001"
electrum_type = "electrs"
network = "signet"
fee_rate_tolerance = 5
database_file="wallet.db"
confirmation_target = 2
max_fee_rate = 1
```

The test mercury key server URL is: `http://test.mercurylayer.com:8500`

> Note that this is a test server. It is free to use, but there is no guarantee of persistence or security. Use only for testnet or signet coins. 

Once the settings are complete, initialise a wallet using:

```
cargo run create-wallet <wallet_name>
```

Running this with name `test_wallet` should return an object like:

```
Wallet created: Wallet { name: "test_wallet", mnemonic: "core parade visual doctor region beach approve slim refuse drip rigid develop", version: "0.1.0", state_entity_endpoint: "http://test.mercurylayer.com:8500", electrum_endpoint: "tcp://mutinynet.com:50001", network: "signet", blockheight: 2820795, initlock: 25920, interval: 6, tokens: [], activities: [], coins: [] }
```

In order to use the mercury layer key server, an access token is required in order to create a shared key. For the test server, tokens can be generated as follows from the command line:

```
cargo run new-token
```

Which will return a `token_id` e.g. `e7d8c299-7121-48b3-bc78-8c70bf4c9691`

With a valid token, it is then possible to generate a shared key and address to deposit testnet bitcoin into:

```
cargo run new-deposit-address <wallet_name> <token> <amount>
```

For example the following will initialise a coin for an amount of 200000 sats. 

```
cargo run new-deposit-address test_wallet e7d8c299-7121-48b3-bc78-8c70bf4c9691 200000
```

This command will then generate the shared key with the server and display the address, e.g.:

```
{
  "address": "tb1p0rl49a3ddl44y9y9wsazp29ez3rgp97dqljsdrpqmanklppx4qgscahkex"
}
```

Copy the address and pay the specified amount to it. For the mutinynet signet network, this payment can be made directly via the faucet: [faucet.mutinynet.com](https://faucet.mutinynet.com/)

Once paid, run:

```
cargo run list-statecoins <wallet-name>
```

To list the coins in the wallet and complete the deposit process. 

This will return e.g.:

```
[
  {
    "coin.address": "tml1qqpruc0ty5zl4z25juqaq5d8vrgl6d28tktl7cuh8ygus47vgy0d9kgr2weknc939dy8sdlxy8w8ffwaczvzu844rcs33cwvdgerh2ytdwtsvajeh6",
    "coin.aggregated_address": "tb1p0rl49a3ddl44y9y9wsazp29ez3rgp97dqljsdrpqmanklppx4qgscahkex",
    "coin.amount": 100000,
    "coin.locktime": 1189682,
    "coin.statechain_id": "99e79535933642758735620e621e8e9b",
    "coin.status": "UNCONFIRMED",
    "coin.user_pubkey": "023e61eb2505fa89549701d051a760d1fd35475d97ff63973911c857cc411ed2d9"
  }
]
```

Once the `coin.status` shows `CONFIRMED`, the coin can be transferred. 

To generate a statecoin receieve address, run:

```
cargo run new-transfer-address <wallet_name>
```

Which will generate a mercury layer address to recieve a coin to. e.g.:

```
{
  "new_transfer_address:": "tml1qqp7m5tc9auxgwka84tez9vksky2lsp5uftyhhduakt75j8yq46wh3crh26fwzxw2akc43d9m0pvuhmuq57tcdtw7pz96zfsz8ck3d3jjf3q04re26"
}
```

This address can then be used to send a specified coin (with `statechain_id`) coin to a specified statechain address:

```
cargo run transfer-send <wallet_name> <statechain-id> <statechain-address>
```

For example, with the confirmed coin above (`coin.statechain_id: "99e79535933642758735620e621e8e9b"`

```
cargo run transfer-send test_wallet tml1qqp7m5tc9auxgwka84tez9vksky2lsp5uftyhhduakt75j8yq46wh3crh26fwzxw2akc43d9m0pvuhmuq57tcdtw7pz96zfsz8ck3d3jjf3q04re26 99e79535933642758735620e621e8e9b
```

This will return:

```
{
  "Transfer": "sent"
}
```

The recevier then runs the following command to finalise the receipt of the coin and update the key share:

```
cargo run transfer-receive <wallet_name>
```

The coin will then appear in the coins list:

```
cargo run list-statecoins <wallet-name>
```

To send the coin back to a standard on-chain bitcoin address, simply run:

```
cargo run withdraw <wallet_name> <statechain-id> <btc-address> <optional_fee_rate>
```

For the demo test coins, these can be sent back to an address generated by the faucet: [faucet.mutinynet.com](https://faucet.mutinynet.com/)

In case the coin expires and the mercury server is unavailable, the backup transaction can be used as follows:

```
cargo run broadcast-backup-transaction <wallet_name> <statechain-id> <btc-address> <optional_fee_rate>
```

