describe('Groups Feature', () => {
  beforeEach(() => {
    // Visit the groups page before each test
    cy.intercept('GET', '**/api/users/*/invites', {
      statusCode: 200,
      body: [
        {
          invite_id: 1,
          group_id: 1,
          group_name: 'Test Group',
          inviter_name: 'Test User'
        }
      ]
    }).as('getInvites');
    
    cy.visit('/')

    cy.get('input[name="email"]').type('jc@uwaterloo.ca')
    cy.get('input[name="password"]').type('Password')

    cy.contains('button', 'Log In').click()

    // wait for Firebase login + redirect
    cy.contains('Home', { timeout: 10000 }).should('be.visible')

    // click the Navbar link to go to groups
    cy.contains('Groups').click()

    // confirm groups page loaded
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

describe('Group invitations', () => {
  const inviteStub = [
    { invite_id: 1, group_id: 1, group_name: 'Test Group', inviter_name: 'Test User' }
  ];

  beforeEach(() => {
    cy.intercept('GET', '**/api/users/by-email*', { statusCode: 200, body: { userId: 1 } });
    cy.intercept('GET', '**/api/users/*/invites', { statusCode: 200, body: inviteStub }).as('getInvites');
    cy.visit('/');
    cy.get('input[name="email"]').type('jc@uwaterloo.ca');
    cy.get('input[name="password"]').type('Password');
    cy.contains('button', 'Log In').click();
    cy.contains('Home', { timeout: 10000 }).should('be.visible');
    cy.contains('Groups').click();
    cy.url().should('include', '/groups');
  });

  it('should show invitation banner when user has pending invites', () => {
    cy.wait('@getInvites');
    cy.contains('Test User invited you to join').should('be.visible');
    cy.contains('Test Group').should('be.visible');
    cy.contains('button', 'Accept').should('be.visible');
    cy.contains('button', 'Decline').should('be.visible');
  });

  it('should show feedback popup when declining an invite', () => {
    cy.intercept('POST', '**/api/invites/*/respond', { statusCode: 200, body: { message: 'Invite declined' } });
    cy.wait('@getInvites');
    cy.contains('button', 'Decline').first().click();
    cy.contains(/You have declined the invitation to join group/).should('be.visible');
    cy.contains('Test Group').should('be.visible');
    cy.get('button[aria-label="Close"]').should('be.visible');
  });

  it('should show feedback popup when accepting an invite', () => {
    cy.intercept('POST', '**/api/invites/*/respond', { statusCode: 200, body: { message: 'Invite accepted' } });
    cy.wait('@getInvites');
    cy.contains('button', 'Accept').first().click();
    cy.contains(/You have accepted the invitation to join group/).should('be.visible');
  });
});