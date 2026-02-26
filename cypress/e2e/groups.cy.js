describe('Groups Feature', () => {
  beforeEach(() => {
    // Visit the groups page before each test
    cy.visit('http://localhost:3000/groups');
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

  it('should navigate to group details when clicking a group', () => {
    cy.get('h3').first().click();
    cy.url().should('include', '/groups/');
    cy.contains('Back to Groups').should('be.visible');
  });
});