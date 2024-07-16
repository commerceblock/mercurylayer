// Import puppeteer
import puppeteer from 'puppeteer';
// const puppeteer = require('puppeteer');
import path from 'path';
import {expect} from 'chai';
import mercuryweblib from 'mercuryweblib';

(async () => {
  // Launch the browser
  const browser = await puppeteer.launch();

  // Create a page
  const page = await browser.newPage();

  // Go to your site
  // await page.goto('YOUR_SITE');

  // Evaluate JavaScript
  const three = await page.evaluate(async () => {
    // assert(true);
    let wallet1 = await mercuryweblib.createWallet(clientConfig, "wallet1");
    return wallet1;
  });

//   await page.goto(`file:${path.join(__dirname, 'test/index.html')}`);

//   const result = await page.evaluate(() => {
//     return window.mochaResults;
//   });

//   console.log(result);

  console.log(three);

  // Close browser.
  await browser.close();
})();