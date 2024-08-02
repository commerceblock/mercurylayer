// const clientConfig = {
//   esploraServer: "https://mempool.space/signet",
//   statechainEntity: "http://127.0.0.1:8000",
//   network: "signet",
//   feeRateTolerance: 5,
//   confirmationTarget: 2,
//   maxFee: 1
// };

const clientConfig = {
  esploraServer: "http://localhost:8094/regtest",
  statechainEntity: "http://127.0.0.1:8000",
  network: "regtest",
  feeRateTolerance: 5,
  confirmationTarget: 2,
  maxFee: 1
};

export default clientConfig;