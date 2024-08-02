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
    wallet_name: String,   // wallet name
}
```

*output*
```
{
    wallet: Wallet, // wallet object
}
```

#### setConfig

Set locktime config

**input:**
```
{
    wallet: Wallet, // wallet object
    server_config: ServerConfig
}
```

*output*
```
{
    wallet: Wallet, // wallet object
}
```

#### setBlockheight

Set blockheight

**input:**
```
{
    wallet: Wallet, // wallet object
    blockheight: number
}
```

*output*
```
{
    wallet: Wallet, // wallet object
}
```

#### addToken

Add a new token to the wallet

**input:**
```
{
    wallet: Wallet,
    token_id: String,
    invoice: String,
    amount: number,
    confirmed: bool
}
```

*output*
```
{
    wallet: Wallet, // wallet object
}
```

#### confirmToken

Confirm token payment

**input:**
```
{
    wallet: Wallet,
    token_id: String,
}
```

*output*
```
{
    wallet: Wallet, // wallet object
}
```

#### getTokens

Get array of tokens from wallet

**input:**
```
{
    wallet: Wallet,
}
```

*output*
```
[{
    token_id: String,
    invoice: String,
    amount: number,
    confirmed: bool
}]
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

Get number of SC address (i.e. current index)

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
    statcoins: [Statecoin]
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
    statcoin: Statecoin
}
```

#### getExpiredCoins

Get all expired coins

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

#### getUnconfirmed

Get all unconfirmed coins

**input:** 
```
{
    wallet: Wallet
}
```

*output*
```
{
    coins: [utxo]
}
```

#### setConfirmed

Set confirmation status of coins

**input:** 
```
{
    wallet: Wallet
    coins: [utxo]    
}
```

*output*
```
{
    wallet: Wallet
}
```

#### transferSender1

Transfer sender - part 1

Signs and initiates transfer

transfer_send_1 sent to `/transfer/sender` (response is transfer_send_2)

**input:** 
```
{
    wallet: Wallet,   // wallet name
    utxo: String // coin to be sent
}
```

*output*
```
{
    wallet: Wallet // TR deposit address
    transfer_send_1: TransferSend1
}
```

#### transferSender2

Transfer sender - part 2

Create backup tx

transfer_send_3 sent to `/sign/first` (response is transfer_send_4)

**input:** 
```
{
    wallet: Wallet,   // wallet name
    transfer_send_2: TransferSend2
}
```

*output*
```
{
    wallet: Wallet // TR deposit address
    transfer_send_3: TransferSend3
}
```

#### transferSender3

Transfer sender - part 3

Sign backup tx

transfer_send_5 sent to `/sign/second` (response is transfer_msg_6)

**input:** 
```
{
    wallet: Wallet,   // wallet name
    transfer_send_4: TransferSend4
}
```

*output*
```
{
    wallet: Wallet // TR deposit address
    transfer_send_5: TransferSend5
}
```

#### transferSender4

Transfer sender - part 4

Generate transfer message 

transfer_send_6 sent to `/sign/second` (response is transfer_send_7)

transfer_send_7 sent to `/transfer/update_msg`

**input:** 
```
{
    wallet: Wallet,   // wallet name
    backup_txs: BackupTxs // backup_txs from DB
    transfer_send_6: TransferSend6
}
```

*output*
```
{
    wallet: Wallet // TR deposit address
    transfer_send_7: TransferSend7
}
```

#### transferReceiver1

Transfer receiver - part 1

Get transfer message

Send response to `/transfer/get_msg_addr/{new_auth_key}` (response is transfer_rec_1)

**input:** 
```
{
    wallet: Wallet,   // wallet name
    index: number // address index
}
```

*output*
```
{
    new_auth_key: String // auth key
}
```

#### transferReceiver2

Transfer receiver - part 2

Get statechain info

Send response to `/info/statechain/{statechain_id}` (response is transfer_rec_2)

**input:** 
```
{
    wallet: Wallet,   // wallet name
    transfer_rec_1: TransferRec1
}
```

*output*
```
{
    statechain_id: String 
}
```

#### transferReceiver3

Transfer receiver - part 3

Verify and Key update

Send response to `/transfer/receiver` (response is transfer_rec_4)

Save backup_txs to DB

**input:** 
```
{
    wallet: Wallet,   // wallet name
    transfer_rec_2: TransferRec2
}
```

*output*
```
{
    wallet: Wallet,
    transfer_rec_3: TransferRec3
    backup_txs: BackupTxs // backup_txs
}
```

#### transferReceiver4

Transfer receiver - part 4

Complete

**input:** 
```
{
    wallet: Wallet,
    transfer_rec_4: TransferRec4
}
```

*output*
```
{
    wallet: Wallet
}
```

#### withdraw1

Withdraw - part 1

Create tx

transfer_wd_1 sent to `/sign/first` (response is transfer_wd_2)

**input:** 
```
{
    wallet: Wallet,   // wallet name
    statechain_id: String,
    address: String // Withdrawal address,
    fee_rate: number
}
```

*output*
```
{
    wallet: Wallet // TR deposit address
    transfer_wd_1: TransferWD1
}
```

#### withdraw2

Withdraw - part 2

Sign tx

transfer_wd_3 sent to `/sign/second` (response is transfer_wd_4)

**input:** 
```
{
    wallet: Wallet,   // wallet name
    transfer_wd_2: TransferWD2
}
```

*output*
```
{
    wallet: Wallet, // TR deposit address
    transfer_wd_3: TransferWD3
}
```

#### withdraw3

Withdraw - part 3

Complete

Withdraw_tx broadcast via electrum interface

**input:** 
```
{
    wallet: Wallet,   // wallet name
    transfer_wd_4: TransferWD4
}
```

*output*
```
{
    wallet: Wallet, // TR deposit address
    withdraw_tx: String
}
```

