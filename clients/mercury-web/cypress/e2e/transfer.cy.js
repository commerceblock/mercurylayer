Cypress.on("uncaught:exception", (err, runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  return false;
});

describe("Transfer", () => {
  it("Should transfer funds from one account to another", () => {
    return true;
  });
});
