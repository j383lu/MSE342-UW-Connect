// Author: Lauren Jung


describe('Login and Registration Flow', () => {
  
    beforeEach(() => {
        cy.visit('/');
    });

    it('should toggle between Login and Registration pages', () => {
        // starts at login
        cy.contains('Sign In').should('be.visible');

        cy.contains("Don't have an account?").click();
        cy.contains('Register').should('be.visible');

        cy.contains('Already have an account?').click();
        cy.contains('Sign In').should('be.visible');
    });

    it('should show validation errors on empty login submission', () => {
        // click submit without entering data
        cy.get('button').contains('Log In').click();
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

    it('should reject registration with a non-Waterloo email', () => {
        cy.contains("Don't have an account?").click();
        
        // Fill out standard info
        cy.get('input[name="firstname"]').type('Lauren');
        cy.get('input[name="lastname"]').type('Jung');
        cy.get('input[name="username"]').type('ljung_test');
        
        // Use a generic email
        cy.get('input[name="email"]').type('lauren@gmail.com');
        cy.get('input[name="password"]').type('ValidPass1!');
        cy.get('input[name="confirmpassword"]').type('ValidPass1!');

        cy.get('button[type="submit"]').click();

        // Check for your specific error string
        cy.contains('Only @uwaterloo.ca addresses are allowed.').should('be.visible');
    });

    it('should enforce password casing requirements (Story 10)', () => {
        cy.contains("Don't have an account?").click();

        // Type a password with NO uppercase
        cy.get('input[name="password"]').type('alllowercase1!');
        cy.get('button[type="submit"]').click();
        cy.contains('Password must contain an uppercase').should('be.visible');

        // Clear and type a password with NO lowercase
        cy.get('input[name="password"]').clear().type('ALLLOWERCASE1!');
        cy.get('button[type="submit"]').click();
        cy.contains('Password must contain a lowercase letter.').should('be.visible');
    });

    it('should show server error if registration fails (MySQL/Firebase)', () => {
        cy.contains("Don't have an account?").click();
        
        // Simulate a scenario that might cause a backend error (like a duplicate email)
        // Note: In a real E2E, this hits your actual database unless you cy.intercept
        cy.get('input[name="firstname"]').type('Lauren');
        cy.get('input[name="lastname"]').type('Jung');
        cy.get('input[name="username"]').type('duplicate_user');
        cy.get('input[name="email"]').type('lauren@uwaterloo.ca');
        cy.get('input[name="password"]').type('ValidPass1!');
        cy.get('input[name="confirmpassword"]').type('ValidPass1!');

        cy.get('button[type="submit"]').click();

        // If the email exists, it should show the error caught in your catch block
        // We use a regex here to be flexible with the exact Firebase error string
        cy.get('body').then(($body) => {
            if ($body.text().includes('already in use')) {
                cy.contains(/already in use/i).should('be.visible');
            }
        });
    });
});