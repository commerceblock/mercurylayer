import './style.css'
import javascriptLogo from './javascript.svg'
import viteLogo from '/vite.svg'
import { setupCounter, setupTests, setupdClearDepositAddress } from './counter.js'

document.querySelector('#app').innerHTML = `
  <div>
    <a href="https://vitejs.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank">
      <img src="${javascriptLogo}" class="logo vanilla" alt="JavaScript logo" />
    </a>
    <h1>Hello Vite!</h1>
    <div class="card">
      <p>Deposit Address:</p>
      <p id="depositAddressText"></p>
      <p>Status:</p>
      <p id="statusText"></p>
      <button id="clearAddressButton" type="button">Clear Address</button>
      <button id="counter" type="button"></button>
      <button id="startTestsButton" type="button">Start Tests</button>
    </div>
    <p class="read-the-docs">
      Click on the Vite logo to learn more
    </p>
  </div>
`

setupCounter(document.querySelector('#counter'))
setupTests(document.querySelector('#startTestsButton'))
setupdClearDepositAddress(document.querySelector('#clearAddressButton'))
