describe('WelcomePage', () => {
  beforeEach(() => {
    cy.visit('/') // This will run before each test
  })

  it('displays welcome message', () => {
    cy.get('[data-cy=welcome-message]').should('exist')
    cy.get('[data-cy=welcome-title]').should('contain', 'Welcome to Mercury')
    cy.get('[data-cy=welcome-description]').should(
      'contain',
      'If you’re using Mercury Layer for the first time'
    )
  })

  it('has buttons for new wallet, load wallet, and recover wallet', () => {
    cy.get('[data-cy=new-wallet-button]').should('exist')
    cy.get('[data-cy=load-wallet-button]').should('exist')
    cy.get('[data-cy=recover-wallet-button]').should('exist')
  })

  it('clicking new wallet button navigates to new wallet page', () => {
    cy.get('[data-cy=new-wallet-button]').click()
    cy.url().should('include', '/new-wallet-0')
  })
})

describe('WalletWizardPage', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.get('[data-cy=new-wallet-button]').click()
    cy.url().should('include', '/new-wallet-0')
  })

  it('displays wallet wizard steps', () => {
    cy.get('[data-cy=wallet-wizard-step]').should('exist')
    cy.get('[data-cy=wallet-info-step]').should('exist')
    cy.get('[data-cy=wallet-seed-step]').should('exist')
    cy.get('[data-cy=confirm-seed-step]').should('exist')
  })

  it('allows selection of network type', () => {
    cy.get('[data-cy=network-type-select]').select('Testnet') // Assuming this is the correct select element
    cy.get('[data-cy=network-type-select]').should('have.value', 'Testnet')
  })

  it('displays confirmation checkbox', () => {
    cy.get('[data-cy=confirmation-checkbox]').should('exist')
  })

  it('clicking GO BACK button navigates to previous page', () => {
    cy.get('[data-cy=go-back-button]').click()
    // Add assertion for navigation if needed
  })
  // Add more tests as needed
  it('click confirmation checkbox', () => {
    cy.get('[data-cy=confirmation-checkbox]').click()
    cy.get('[data-cy=next-button]').should('not.be.disabled')
  })

  it('click confirmation checkbox and press next ', () => {
    cy.get('[data-cy=confirmation-checkbox]').click()
    cy.get('[data-cy=next-button]').should('not.be.disabled')
    cy.get('[data-cy=next-button]').click()
    cy.url().should('include', '/new-wallet-1')
  })
})

describe('WalletWizardPage1', () => {
  beforeEach(() => {
    cy.visit('/') // Visit the initial page
    cy.get('[data-cy=new-wallet-button]').click() // Click on the new wallet button to navigate to the wizard page
    cy.url().should('include', '/new-wallet-0') // Check if the URL includes the expected path
    cy.get('[data-cy=confirmation-checkbox]').click()
    cy.get('[data-cy=next-button]').should('not.be.disabled')
    cy.get('[data-cy=next-button]').click()
    cy.url().should('include', '/new-wallet-1')
  })

  it('should enter a wallet name', () => {
    cy.get('[data-cy=wallet-name-input').type('Hello')
  })

  it('should display an error message when entering a password that does not match confirmation', () => {
    cy.get('[data-cy=password-input]').type('password123')
    cy.get('[data-cy=confirm-password-input]').type('password321')
    cy.get('[data-cy=terms-checkbox]').check()
    cy.get('[data-cy=next-button]').click()
    cy.get('.fixed').should('be.visible').contains('Passwords do not match.')
  })

  /*
  it('should display an error message when wallet name already exists', () => {
    cy.get('[data-cy=wallet-name-input]').type('ExistingWallet')
    cy.get('[data-cy=password-input]').type('password123')
    cy.get('[data-cy=confirm-password-input]').type('password123')
    cy.get('[data-cy=terms-checkbox]').check()
    cy.get('[data-cy=next-button]').click()
    cy.get('.fixed')
      .should('be.visible')
      .contains('A wallet with the same name already exists. Please choose a different name.')
  })*/

  it('should navigate to the next step when all fields are filled correctly', () => {
    cy.get('[data-cy=wallet-name-input]').type('NewWallet')
    cy.get('[data-cy=password-input]').type('password123')
    cy.get('[data-cy=confirm-password-input]').type('password123')
    cy.get('[data-cy=terms-checkbox]').check()
    cy.get('[data-cy=next-button]').should('not.be.disabled').click()
    cy.url().should('include', '/new-wallet-2')
  })
})

describe('WalletWizardPage2', () => {
  beforeEach(() => {
    cy.visit('/') // Visit the initial page
    cy.get('[data-cy=new-wallet-button]').click() // Click on the new wallet button to navigate to the wizard page
    cy.url().should('include', '/new-wallet-0') // Check if the URL includes the expected path
    cy.get('[data-cy=confirmation-checkbox]').click()
    cy.get('[data-cy=next-button]').should('not.be.disabled')
    cy.get('[data-cy=next-button]').click()
    cy.url().should('include', '/new-wallet-1')
    cy.get('[data-cy=wallet-name-input]').type('NewWallet')
    cy.get('[data-cy=password-input]').type('password123')
    cy.get('[data-cy=confirm-password-input]').type('password123')
    cy.get('[data-cy=terms-checkbox]').check()
    cy.get('[data-cy=next-button]').should('not.be.disabled').click()
    cy.url().should('include', '/new-wallet-2')
  })

  it('should display the seed phrase panel', () => {
    cy.get('[data-cy=seed-phrase-panel]').should('be.visible')
  })

  it('should display correct warning messages about storing seed phrase safely', () => {
    cy.contains(
      'Carefully write down and store your seed somewhere safe, as it provides access to your wallet.'
    ).should('exist')
    cy.contains(
      'For best practice, never store it online or on the same computer as the wallet.'
    ).should('exist')
  })

  it('should navigate back to the previous step when "GO BACK" button is clicked', () => {
    cy.get('[data-cy=go-back-button]').click()
    cy.url().should('include', '/new-wallet-1')
  })

  it('should navigate to the next step when "NEXT" button is clicked', () => {
    cy.get('[data-cy=next-button]').click()
    cy.url().should('include', '/new-wallet-3')
  })
})

describe('WalletWizardPage3', () => {
  beforeEach(() => {
    cy.visit('/') // Visit the initial page
    cy.get('[data-cy=new-wallet-button]').click() // Click on the new wallet button to navigate to the wizard page
    cy.url().should('include', '/new-wallet-0') // Check if the URL includes the expected path
    cy.get('[data-cy=confirmation-checkbox]').click()
    cy.get('[data-cy=next-button]').should('not.be.disabled')
    cy.get('[data-cy=next-button]').click()
    cy.url().should('include', '/new-wallet-1')
    cy.get('[data-cy=wallet-name-input]').type('NewWallet')
    cy.get('[data-cy=password-input]').type('password123')
    cy.get('[data-cy=confirm-password-input]').type('password123')
    cy.get('[data-cy=terms-checkbox]').check()
    cy.get('[data-cy=next-button]').should('not.be.disabled').click()
    cy.url().should('include', '/new-wallet-2')
    cy.get('[data-cy=next-button]').click()
    cy.url().should('include', '/new-wallet-3')
  })

  it('should display the Wallet Wizard Page 3', () => {
    // Check if the page contains the relevant elements
    cy.get('[data-cy=step-1-info]').should('contain', 'Wallet Info')
    cy.get('[data-cy=step-2-info]').should('contain', 'Wallet seed')
    cy.get('[data-cy=step-3-info]').should('contain', 'Confirm seed')
    cy.get('[data-cy=confirm-seed-instruction]').should(
      'contain',
      'Click below or type in the missing words to confirm your seed key.'
    )
    cy.get('[data-cy=confirm-seed-panel]').should('exist')
    cy.get('[data-cy=go-back-button]').should('exist')
    cy.get('[data-cy=confirm-button]').should('exist')
  })

  it('should navigate back to Wallet Wizard Page 2 when Go Back button is clicked', () => {
    cy.get('[data-cy=go-back-button]').click()
    cy.url().should('include', '/new-wallet-2')
  })

  /* TODO - issue with ipcRenderer commands for some reason in cypress
  it('should navigate to the next step when Confirm button is clicked', () => {
    cy.get('[data-cy=confirm-button]').click()
    cy.url().should('include', '/mainpage')
  })*/
})
