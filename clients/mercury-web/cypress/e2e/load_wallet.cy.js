Cypress.on("uncaught:exception", (err, runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  return false;
});

describe("LoadWallet", () => {
  // Should load an existing wallet from the database supplied
  it("Should load an existing wallet from the database supplied", () => {
    return true;
  });
});
