import * as mercury_wasm from 'mercury-wasm'
import cryptojs from 'crypto-js'

const createMnemonic = async () => {
  let mnemonic = mercury_wasm.generateMnemonic()
  return mnemonic
}

const createHashedPassword = (password) => {
  cryptojs.SHA256(password).toString()
}
const encryptString = (dataString, password) => {
  let encryptdata = cryptojs.AES.encrypt(dataString, password).toString()
  return encryptdata
}

const decryptString = async (encryptedData, password) => {
  try {
    var bytes = await cryptojs.AES.decrypt(encryptedData, password)
    var decryptedData = await bytes.toString(cryptojs.enc.Utf8)
    return decryptedData
  } catch (error) {
    throw new Error('Decryption failed: ' + error.message)
  }
}

const createWallet = async (name, mnemonic, walletNetwork) => {
  let block_header = await window.api.electrumRequest({
    method: 'blockchain.headers.subscribe',
    params: []
  })
  let blockheight = block_header.height

  let serverInfo = await window.api.infoConfig()

  let configFile = await window.api.getConfigFile() // remove later
  let electrumEndpoint = configFile.electrumServer // remove later
  let statechainEntityEndpoint = configFile.statechainEntity // remove later

  let wallet = {
    name,
    mnemonic,
    version: '0.1.0',
    state_entity_endpoint: statechainEntityEndpoint, // remove later
    electrum_endpoint: electrumEndpoint, // remove later
    network: walletNetwork, // remove later
    blockheight,
    initlock: serverInfo.initlock,
    interval: serverInfo.interval,
    tokens: [],
    activities: [],
    coins: [],
    settings: {
      network: walletNetwork,
      block_explorerURL: 'https://mempool.space/testnet',
      torProxyHost: 'socks5h://localhost',
      torProxyPort: '9050',
      torProxyControlPassword: '',
      torProxyControlPort: '',
      statechainEntityApi: 'http://127.0.0.1:8000',
      torStatechainEntityApi:
        'http://j23wevaeducxuy3zahd6bpn4x76cymwz2j3bdixv7ow4awjrg5p6jaid.onion',
      electrumProtocol: 'ssl',
      electrumHost: 'electrum.blockstream.info',
      electrumPort: 60002,
      electrumType: 'electrs',
      notifications: false,
      tutorials: false
    }
  }

  return wallet
}

export default { createWallet, createMnemonic, encryptString, decryptString }
