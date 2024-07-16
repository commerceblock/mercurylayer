import sum from "../sum.js";
import clientConfig from '../ClientConfig.js';
import {expect} from 'chai';
import mercuryweblib from 'mercuryweblib';
import { JSDOM } from 'jsdom';

describe('TB01 - Simple Transfer', function() {

    before(function() {
      const { window } = new JSDOM('', { url: 'http://localhost' });
      global.window = window;
      global.document = window.document;
      global.localStorage = window.localStorage;
    });

    context('Simple Transfer', function() {
        it('should work', async function() {

          await mercuryweblib.createWallet(clientConfig, "wallet1");

          expect(sum()).to.equal(0)
        })
      })

});