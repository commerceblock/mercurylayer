// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import "./commands";

// Set up intercepts
before(() => {
  // Intercept API requests and redirect them to the mock server
  cy.intercept("GET", "token/token_confirm/", {
    fixture: "tokenConfirmDebug.json",
  }).as("confirmDebugToken");

  cy.intercept("GET", "token/token_init", {
    fixture: "tokenInit.json",
  }).as("getRealToken");

  cy.intercept("GET", "token/token_verify/", {
    fixture: "tokenVerify.json",
  }).as("checkToken");

  cy.intercept("GET", "deposit/init/pod", {
    fixture: "depositInitPod.json",
  }).as("initPod");

  cy.intercept("GET", "deposit/get_token", {
    fixture: "depositGetToken.json",
  }).as("getToken");

  cy.intercept("GET", "info/config", {
    fixture: "infoConfig.json",
  }).as("infoConfig");

  cy.intercept("POST", "transfer/sender", {
    fixture: "transferUpdateMsg.json",
  }).as("getNewX1");

  cy.intercept("POST", "transfer/update_msg", {
    fixture: "transferSender.json",
  }).as("updateMsg");

  cy.intercept("GET", "transfer/get_msg_addr/", {
    fixture: "transferMessageAddress.json",
  }).as("getMsgAddr");

  cy.intercept("POST", "transfer/receiver", {
    fixture: "transferReceiver.json",
  }).as("sendTransferReceiverRequestPayload");

  cy.intercept("GET", "info/statechain/1", {
    fixture: "infoStatecoin1.json",
  }).as("getStatechainInfo");

  cy.intercept("POST", "sign/first", {
    fixture: "signFirst.json",
  }).as("signFirst");

  cy.intercept("POST", "sign/second", {
    fixture: "signSecond.json",
  }).as("signSecond");
});
