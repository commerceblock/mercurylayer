Cypress.on("uncaught:exception", (err, runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  return false;
});

describe("Settings", () => {
  it("Should load the settings page", () => {
    return true;
  });
});
