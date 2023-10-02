# Mercury layer WASM library

The Mercury layer operates as a client/server application. The Mercury client is a rust application (compiled to web-assmeby) that connects to the *mercury server* and Electrum server via http (over the Tor network). 

## WASM functions

#### fromMnemonic

Create a new wallet from 12 word BIP39 seed phrase

**input:** 
```
{
    network: String, // mainnet, testnet or regtest
    mnemonic: String,    // 12 word seed phrase
    password: String, // encryption password
    wallet_name: String,   // wallet name
}
```

*output*
```
{
    wallet: Wallet, // wallet object
}
```

#### getBalance

Get current wallet balance

**input:** 
```
{
    wallet: Wallet,   // wallet
}
```

*output*
```
{
    balance: u32, // wallet balance
}
```

#### getSCAddress

Get SC address

**input:** 
```
{
    wallet: Wallet, // wallet name
    index: u64 // address index, 0 is new address
}
```

*output*
```
{
    address: String, // Receive address for fee payments
    index: u64 // address index
}
```

#### getNumAddress

Get number of SC address

**input:** 
```
{
    wallet: Wallet,   // wallet name
}
```

*output*
```
{
    number: u64 // number of SC addresses
}
```

#### getActivityLog

Get activity log

**input:** 
```
{
    wallet: Wallet,   // wallet name
}
```

*output*
```
{
    activity_log: [{}] // list of activity log objects 
}
```

#### getStatecoinList

Get list of statecoins

**input:** 
```
{
    wallet: wallet,   // wallet name 
    available: bool // all statecoins objects or only available coins
}
```

*output*
```
{
    statcoins: [statechain_id:user_id, status, value, txid:vout, locktime]
}
```

#### getStateCoin

Get statecoin object

**input:** 
```
{
    wallet: Wallet,   // wallet name
    statechain_id: String // statecoin ID
}
```

*output*
```
{
    statcoin: {}
}
```

#### getExpiredCoins

Get statecoin object

**input:** 
```
{
    wallet: Wallet,   // wallet name
    locktime: u64 // current blockheight
}
```

*output*
```
{
    statcoins: [{}] // list of statecoin objects
}
```

#### setCPFP

Set CPFP tx

**input:** 
```
{
    wallet: Wallet,   // wallet name
    statechain_id: String
    fee_rate: u32 // CPFP fee rate
    address: String // pay to address
}
```

*output*
```
{
    cpfp_tx: String // CPFP tx hex
}
```

#### getCPFP

Get all valid CPFP txs:

**input:** 
```
{
    wallet: Wallet,   // wallet name
    height: u32 // expiry block height
}
```

*output*
```
{
    cpfp_tx: [String] // CPFP tx hex
}
```

#### deposit1

Deposit a statecoin - part 1

Derives new key shares

deposit_msg_1 sent to `/deposit/init/pod`

**input:** 
```
{
    wallet: Wallet,   // wallet name
    amount: u64 // coin value
    token_id: String // token ID
}
```

*output*
```
{
    wallet: Wallet // TR deposit address
    deposit_msg_1: Json
}
```

#### deposit2

Deposit a statecoin - part 2

deposit_msg_3 sent to `/sign/first`

Display `deposit_address` to user. 

**input:** 
```
{
    wallet: Wallet,   // wallet
    deposit_msg_2: Json
}
```

*output*
```
{
    wallet: Wallet 
    deposit_msg_3: Json
    deposit_address: String
}
```

#### deposit3

Deposit a statecoin - part 3

deposit_msg_5 sent to `/sign/second`

**input:** 
```
{
    wallet: Wallet,   // wallet
    deposit_msg_4: Json
}
```

*output*
```
{
    wallet: Wallet 
    deposit_msg_5: Json
}
```

#### deposit4

Deposit a statecoin - part 4

**input:** 
```
{
    wallet: Wallet,   // wallet
    deposit_msg_6: Json
}
```

*output*
```
{
    wallet: Wallet
}
```
