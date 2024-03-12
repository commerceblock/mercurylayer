// Import our outputted wasm ES6 module
// Which, export default's, an initialization function
import init from "./pkg/my_project.js";
import { fromMnemonic } from "./pkg/my_project.js";
import { getSCAddress } from "./pkg/my_project.js";
import { getBalance } from "./pkg/my_project.js";
import { generateMnemonic } from "./pkg/my_project.js";
import { generateSeed } from "./pkg/my_project.js";

const runWasm = async () => {
  // Instantiate our wasm module
  const mercury_wasm = await init("./pkg/my_project_bg.wasm");

  // Call the Add function export from wasm, save the result
  const mnemonic = generateMnemonic();

  const seed = generateSeed();

  const wallet_name = "MyWallet";

  const wallet = fromMnemonic(wallet_name, mnemonic);

  console.log(wallet);

  console.log(getSCAddress(wallet, 1));

  const balance = getBalance(wallet);

  const address = getSCAddress(wallet, 1);

  // Set the result onto the body
  document.body.textContent = `Wallet mnemonic: ${mnemonic} Wallet balance: ${balance} Wallet address: ${address} Seed: ${seed}`;

};
runWasm();
