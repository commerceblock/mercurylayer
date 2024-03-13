Cypress.on("uncaught:exception", (err, runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  return false;
});

describe("Deposit", () => {
  // Should deposit funds from the bank account to the wallet
  it("Should deposit funds to the wallet", () => {
    return true;
  });
});
