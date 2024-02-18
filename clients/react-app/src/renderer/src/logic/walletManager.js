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

const decryptString = (encryptedData, password) => {
  var bytes = cryptojs.AES.decrypt(encryptedData, password)
  var decryptdData = bytes.toString(cryptojs.enc.Utf8)
  return decryptdData
}

const createWallet = async (name, mnemonic) => {
  let block_header = await window.api.electrumRequest({
    method: 'blockchain.headers.subscribe',
    params: []
  })
  let blockheight = block_header.height

  let serverInfo = await window.api.infoConfig()

  let configFile = await window.api.getConfigFile()

  let electrumEndpoint = configFile.electrumServer
  let statechainEntityEndpoint = configFile.statechainEntity
  let network = configFile.network

  let wallet = {
    name,
    mnemonic,
    version: '0.1.0',
    state_entity_endpoint: statechainEntityEndpoint,
    electrum_endpoint: electrumEndpoint,
    network: network,
    blockheight,
    initlock: serverInfo.initlock,
    interval: serverInfo.interval,
    tokens: [],
    activities: [],
    coins: []
  }

  return wallet
}

export default { createWallet, createMnemonic, encryptString, decryptString }
