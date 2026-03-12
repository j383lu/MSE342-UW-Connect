describe('App', () => {
    it('renders the login', () => {
        cy.visit('/');
        cy.get('body').should('be.visible');
    });
});
