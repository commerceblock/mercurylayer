

import { useDispatch } from 'react-redux'
import { walletActions } from './store/wallet'


import CreateWallet from './components/CreateWallet'
import { useEffect } from 'react'


import init  from 'mercury-wasm';
import wasmUrl from 'mercury-wasm/mercury_wasm_bg.wasm?url'

function App() {
  const dispatch = useDispatch();

  useEffect(() => {

    const loadWasm = async () => {
      await init(wasmUrl);
      // let mnemonic = generateMnemonic();
      // console.log("mnemonic:", mnemonic);
    };

    loadWasm();
    
  }, []);

  return (
    <div className="container">

      <CreateWallet />

    </div>
  )
}

export default App
