describe('App', () => {
it('renders the page', () => {
cy.visit('/');
cy.get('body').should('be.visible');
});
});