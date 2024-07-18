import mercuryweblib from 'mercuryweblib';
import clientConfig from './ClientConfig.js';
import { tb01ExecuteSimpleTransfer } from './tb01-simple-transfer.js';
import { tb03SimpleAtomicTransfer } from './tb03-simple-atomic-transfer.js';
import { tb04SimpleLightningLatch } from './tb04-simple-lightning-latch.js';

function setupCounter(element) {
  let counter = 0
  const setCounter = (count) => {
    counter = count
    element.innerHTML = `count is ${counter}`
  }
  element.addEventListener('click', () => setCounter(counter + 1))
  setCounter(0)
}

function setupTests(element) {
  
  const startTests = async () => {
    // tb01ExecuteSimpleTransfer();
    // tb03SimpleAtomicTransfer();
    tb04SimpleLightningLatch();
  }
  element.addEventListener('click', () => startTests())
}

function setupdClearDepositAddress(element) {
  const eraseText = () => {
    const textElement = document.getElementById('depositAddressText');
    textElement.textContent = '';
  }

  element.addEventListener('click', () => eraseText())
}

export { setupCounter, setupTests, setupdClearDepositAddress } ;

