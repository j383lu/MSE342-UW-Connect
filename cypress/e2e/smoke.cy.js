describe('App', () => {
    it('renders the page', () => {
        cy.visit('/');
        cy.get('body').should('be.visible');
    });

    it('renders the login page', () => {
        cy.visit('/login');
        cy.get('input[name="username"]').should('be.visible');
    });
});
