// Author: Lauren Jung

describe('Login and Registration Flow', () => {
  
    beforeEach(() => {
        cy.visit('/login');
    });

    it('should toggle between Login and Registration pages', () => {
        // starts at login
        cy.contains('h1', 'Sign In').should('be.visible');
    
        // switch to registration
        cy.contains("Don't have an account? Create an account").click();
        cy.contains('h1', 'Register').should('be.visible');
        cy.contains('Welcome to UW Connect').should('be.visible');

        // switch back to login
        cy.contains('Already have an account? Log in').click();
        cy.contains('h1', 'Sign In').should('be.visible');
    });

    it('should show validation errors on empty login submission', () => {
        // click submit without entering data
        cy.get('button[type="submit"]').click();
        
        // check that the error message exists globally
        cy.contains('This field is required.').should('be.visible');
    });

    it('should validate registration fields and password matching', () => {
        // go to registration
        cy.contains("Don't have an account?").click();

        // test specific field regex 
        cy.get('input[name="firstname"]').type('Lauren123');
        cy.contains('Only letters are allowed.').should('be.visible');

        // test password mismatch
        cy.get('input[name="password"]').type('Password123');
        cy.get('input[name="confirmpassword"]').type('DifferentPassword');
        cy.get('button[type="submit"]').click();
        cy.contains('Passwords must match').should('be.visible');
    });

    it('should toggle password visibility', () => {
        // select the password field
        cy.get('input[name="password"]').should('have.attr', 'type', 'password');
        
        // click the eye icon (IconButton)
        cy.get('input[name="password"]')
        .parent()
        .find('button')
        .click();

        // check if type changed to text
        cy.get('input[name="password"]').should('have.attr', 'type', 'text');
    });

    it('should allow filling out the registration form completely', () => {
        cy.contains("Don't have an account?").click();
        
        cy.get('input[name="firstname"]').type('Lauren');
        cy.get('input[name="lastname"]').type('Jung');
        cy.get('input[name="email"]').type('lauren@uwaterloo.ca');
        cy.get('input[name="username"]').type('ljung_uw');
        cy.get('input[name="password"]').type('SecurePass123');
        cy.get('input[name="confirmpassword"]').type('SecurePass123');

        cy.get('button[type="submit"]').click();
        
        // since there is no redirect yet, check the console log or lack of errors
        cy.get('body').should('not.contain', 'This field is required.');
    });
});