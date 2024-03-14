//import ElectrumCli from "@mempool/electrum-client";
import { ElectrumClient, GenesisConfig } from "@nimiq/electrum-client";

GenesisConfig.main();

// Connect to Blockstream Bitcoin Mainnet server via NIMIQ.WATCH proxy
const electrumClient = new ElectrumClient({
  endpoint: "wss://blockstream.info/liquidtestnet/electrum-websocket/api:60002",
  proxy: true,
  token: "testnet:blockstream.info/liquidtestnet/",
  network: "testnet",
});

electrumClient.waitForConsensusEstablished().then(() => {
  console.log("Consensus established");
});

const urlElectrum = "ssl://electrum.blockstream.info:60002"; // TODO: get config from the wallet instead
const urlElectrumObject = new URL(urlElectrum);
const electrumPort = parseInt(urlElectrumObject.port, 10);
const electrumHostname = urlElectrumObject.hostname;
const electrumProtocol = urlElectrumObject.protocol.slice(0, -1); // remove trailing ':'

export const disconnectElectrumClient = async () => {
  await electrumClient.close();
};

export const electrumRequest = async (method) => {
  console.log("object passed in was:", method);

  const methodName = method.method;
  const params = method.params || [];

  console.log("method passed was:", methodName);
  console.log("params passed were:", params);

  // Call the corresponding method of ElectrumClient class based on methodName
  switch (methodName) {
    case "blockchain.headers.blockheight":
      return electrumClient.getHeadHeight();
    case "blockchain.headers.subscribe":
      return new Promise((resolve, reject) => {
        const handle = electrumClient.addHeadChangedListener((head) => {
          console.log("head value is:", head);
          // Resolve the promise with the received head
          resolve(head);
          // Remove the listener after resolving the promise
          electrumClient.removeListener(handle);
        });
      });
    case "blockchain.transaction.broadcast":
      return electrumClient.sendTransaction(...params);
    case "blockchain.scripthash.listunspent":
      return electrumClient.getTransactionsByAddress(...params);
    case "blockchain.transaction.get":
      return electrumClient.getTransaction(...params);
    case "blockchain.estimatefee":
      try {
        const fee = await electrumClient.estimateFees([3]);
        console.log("Fee was:", fee);
        return fee;
      } catch (error) {
        console.error("Error estimating fee:", error);
        throw error;
      }
    default:
      throw new Error("Method not supported: " + methodName);
  }
};
