describe('Groups Feature', () => {
  beforeEach(() => {
    // Visit the groups page before each test
    cy.visit('/')

    cy.get('input[name="email"]').type('jc@uwaterloo.ca')
    cy.get('input[name="password"]').type('Password')

    cy.contains('button', 'Log In').click()

    // wait for Firebase login + redirect
    cy.contains('Home', { timeout: 10000 }).should('be.visible')

    // Click the Navbar link to go to groups
    cy.contains('Groups').click()

    // Confirm groups page loaded
    cy.url().should('include', '/groups')
    cy.contains('Groups').should('be.visible')
  });



  it('should load the groups page', () => {
    cy.contains('Groups').should('be.visible');
    cy.contains('+ Create Group').should('be.visible');
  });

  it('should have category filter dropdown', () => {
    cy.contains('Category:').should('be.visible');
    cy.get('select').first().should('be.visible');
  });

  it('should have search input', () => {
    cy.get('input[placeholder*="Search groups"]').should('be.visible');
  });

  it('should display at least one group', () => {
    cy.get('h3').should('exist');
  });

  it('should navigate to create group page', () => {
    cy.contains('+ Create Group').click();
    cy.url().should('include', '/groups/new');
    cy.contains('Create New Group').should('be.visible');
  });
});