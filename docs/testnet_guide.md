# Mercury layer testnet instructions

The Mercury layer client is implemented as both Rust and Nodejs libraries, but also as a standalone command line app. These instructions describe setting up and using the standalone rust client to send testnet coins on mercurylayer. 

The client accesses the mercury key server via Tor. In order connect to the server, the client app requires access to a Tor server via a SOCKS proxy. To use the standalone client you will therefore need to be running a local Tor instance - this can be done via installing and runnning a Tor server, or more simply by just downloading and running the Tor browser: https://www.torproject.org/download/

For instructions on installing and running a standalone Tor daemon, see: https://community.torproject.org/onion-services/setup/install/

In addition, Rust must be installed. To do this on a Linux or MacOS system, simply run:

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
cd clients/standalone-rust
```

In this directory is the `Settings.toml` file for the client. This needs to be edited (using any text editor, e.g. vi or nano) to set the mercury server endpoint, tor proxy and Electrum server URL. 

The test mercury key server Tor address is: `http://caqa7fv4wmmhj7owhmkdq23nfejxoibsi74qos2ggldbtg75u45g4uid.onion`

> Note that this is a test server. It is free to use, but there is no guarantee of persistence or security. Use only for testnet or signet coins. 

If you are running a local Tor server directly, the `tor_proxy` will be `socks5h://localhost:9050`. If you are running a Tor browser, it will be `socks5h://127.0.0.1:9150`. 

The settings files should then be:

```
statechain_entity = "http://caqa7fv4wmmhj7owhmkdq23nfejxoibsi74qos2ggldbtg75u45g4uid.onion"
tor_proxy = "socks5h://127.0.0.1:9150"
electrum_server = "tcp://electrum.blockstream.info:60001"
network = "testnet"
fee_rate_tolerance = 5
database_file="wallet.db"
```

Once the settings are complete, initialise the wallet seed using:

```
cargo run show-mnemonic
```

In order to use the mercury layer key server, an access token is required in order to create a shared key. For the test server, tokens can be generated on demand by just hitting a `get_token` endpoint, as follows from the command line:

```
curl --proxy socks5h://localhost:9150 'http://caqa7fv4wmmhj7owhmkdq23nfejxoibsi74qos2ggldbtg75u45g4uid.onion/deposit/get_token'
```

Which will return a `token_id` e.g. `e7d8c299-7121-48b3-bc78-8c70bf4c9691`

With a valid token, it is then possible to generate a shared key and address to deposit testnet bitcoin into:

```
cargo run deposit token_id amount
```

For example the following will initialise a coin for an amount of 200000 sats. 

```
cargo run deposit e7d8c299-7121-48b3-bc78-8c70bf4c9691 200000
```

This command will then generate the shared key with the server and display the address, e.g.:

```
address: tb1phasgatkps9lh9jvgnpjdvcgw6zzkw0rwnh76gtkr4hqhzkp3hykqys0hys
waiting for deposit ....
```

Copy the address and pay the specified amount to it via any other wallet with a testnet balance. Once the coin has been sent and enters the mempool, the deposit process will complete and the `statechain_id` will be displayed:

```
{
  "statechain_id": "19ae142de9e64cb4b4dd93e669c86b00"
}
```

The statecoin is now initialised, and can be transferred to another owner, or sent to an on-chain address. 

To generate a statecoin receieve address, run:

```
cargo run new-transfer-address
```

Which will generate a bech32 encoded `sc` address, e.g.:

```
{
  "transfer_address": "sc1qqp3t4dvnnpams7zf7thydpxnmr05h65na3y2zyugh6l9cvm8wsgvsgz5cr75fuh0dauy2lqa5n84vvgkfpzqjm27f2s0hdk87eqyxgujcdqdeu7nn"
}
```

This address can then be used to send a specified coin (with `statechain_id`) coin to a specified statechain address:

```
cargo run transfer-send <statechain-address> <statechain-id>
```

E.g.:

```
cargo run transfer-send sc1qqp3t4dvnnpams7zf7thydpxnmr05h65na3y2zyugh6l9cvm8wsgvsgz5cr75fuh0dauy2lqa5n84vvgkfpzqjm27f2s0hdk87eqyxgujcdqdeu7nn 19ae142de9e64cb4b4dd93e669c86b00
```

The recevier then runs the following command to finalise the receipt of the coin and update the key share:

```
cargo run transfer-receive
```

To send the coin back to a standard bitcoin address, simply run:

```
cargo run withdraw <btc-address> <statechain-id>
```

For more commands of the standalone client, see the `README.md` file. 