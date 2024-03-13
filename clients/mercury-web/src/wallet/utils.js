import axios from "axios";
// import config from "config";
//import SocksProxyAgentLib from "socks-proxy-agent";

import { electrumRequest } from "./electrumClient";

//const SocksProxyAgent = SocksProxyAgentLib.SocksProxyAgent;

import bitcoinjs from "bitcoinjs-lib";
import ecc from "@bitcoinerlab/secp256k1";

bitcoinjs.initEccLib(ecc);

const infoConfig = async () => {
  const statechain_entity_url = "http://45.76.136.11:9000/"; // config.get("statechainEntity");
  const path = "info/config";

  let fee_rate_btc_per_kb = await electrumRequest("blockchain.estimatefee", [
    3,
  ]);

  // Why does it happen?
  if (fee_rate_btc_per_kb <= 0) {
    fee_rate_btc_per_kb = 0.00001;
  }
  const fee_rate_sats_per_byte = fee_rate_btc_per_kb * 100000.0;

  const torProxy = undefined; // config.get("torProxy");

  let socksAgent = undefined;

  if (torProxy) {
    //socksAgent = { httpAgent: new SocksProxyAgent(torProxy) };
  }

  let response = await axios.get(
    statechain_entity_url + "/" + path,
    socksAgent
  );
  return {
    initlock: response.data.initlock,
    interval: response.data.interval,
    fee_rate_sats_per_byte,
  };
};

const getConfigFile = () => {
  return {
    statechainEntity: "http://45.76.136.11:9000/",
    electrumServer: "ssl://electrum.blockstream.info:60002",
    network: "testnet",
    feeRateTolerance: 0.05,
    databaseFile: "wallet.db",
    confirmationTarget: 1,
    torProxy: undefined,
  };
};

const getNetwork = (wallet_network) => {
  switch (wallet_network) {
    case "signet":
      return bitcoinjs.networks.testnet;
    case "testnet":
      return bitcoinjs.networks.testnet;
    case "regtest":
      return bitcoinjs.networks.regtest;
    case "mainnet":
      return bitcoinjs.networks.bitcoin;
    default:
      throw new Error("Unknown network");
  }
};

const convertAddressToReversedHash = (address, _network) => {
  const network = getNetwork(_network);

  let script = bitcoinjs.address.toOutputScript(address, network);
  let hash = bitcoinjs.crypto.sha256(script);
  let reversedHash = Buffer.from(hash.reverse());
  reversedHash = reversedHash.toString("hex");

  return reversedHash;
};

export { infoConfig, getConfigFile, convertAddressToReversedHash };
