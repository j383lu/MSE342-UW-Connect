/** Stub data so Groups E2E does not depend on MySQL + specific Firebase user data. */

/** Self-contained (no ./helpers import) so Cypress bundles in CI even if helpers/ is missing. */
function visitLogin(path = '/') {
  cy.clearAllCookies();
  cy.clearAllLocalStorage();
  cy.clearAllSessionStorage();
  cy.visit('about:blank');
  cy.window().then((win) => {
    return new Cypress.Promise((resolve) => {
      const done = () => resolve(null);
      try {
        const del = win.indexedDB.deleteDatabase('firebaseLocalStorageDb');
        del.onsuccess = done;
        del.onerror = done;
        del.onblocked = done;
      } catch {
        done();
      }
    });
  });
  cy.visit(path, { timeout: 60000 });
  cy.get('body', { timeout: 30000 }).should('be.visible');
  cy.get('body').then(($body) => {
    if (!$body.find('input[name="email"]:visible').length) {
      cy.contains('a, button', 'Sign In').filter(':visible').first().click();
    }
  });
  cy.get('#email, input[name="email"]', { timeout: 20000 }).should('be.visible');
}

const MOCK_TAGS = [
  { tag_id: 1, tag_name: 'Academic' },
  { tag_id: 2, tag_name: 'Social' },
];

const MOCK_GROUPS = [
  {
    group_id: 1,
    name: 'Cypress Stub Group',
    description: 'End-to-end test group',
    category: 'Academic',
    creator_id: 1,
    member_count: 3,
    max_members: 20,
    is_private: 0,
    image_url: null,
  },
];

function pathnameFromReq(req) {
  try {
    return new URL(req.url).pathname;
  } catch {
    return '';
  }
}

/** Stubs list GET /api/groups only (not /api/groups/:id/...). */
function stubListGroups() {
  cy.intercept('GET', '**/api/groups', (req) => {
    if (pathnameFromReq(req) !== '/api/groups') {
      req.continue();
      return;
    }
    req.reply({ statusCode: 200, body: MOCK_GROUPS });
  });
}

function stubGroupsBackend({ invitesBodyOrFn } = {}) {
  cy.intercept('GET', '**/api/users/by-email*', { statusCode: 200, body: { userId: 1 } });
  cy.intercept('GET', '**/api/tags', { statusCode: 200, body: MOCK_TAGS });
  stubListGroups();
  cy.intercept('GET', '**/api/users/*/groups/member', { statusCode: 200, body: [] });
  cy.intercept('GET', '**/api/users/*/join-requests-as-owner', { statusCode: 200, body: [] });
  cy.intercept('GET', '**/api/posts**', { statusCode: 200, body: [] });

  if (typeof invitesBodyOrFn === 'function') {
    cy.intercept('GET', '**/api/users/*/invites', invitesBodyOrFn).as('getInvites');
  } else {
    cy.intercept('GET', '**/api/users/*/invites', {
      statusCode: 200,
      body: invitesBodyOrFn ?? [],
    }).as('getInvites');
  }
}

/** Some layouts default to “General” (posts); discoverable groups list lives under this tab. */
function openDiscoverGroupsTabIfPresent() {
  cy.get('body').invoke('text').then((text) => {
    if (text.includes('Discover Groups')) {
      cy.contains('Discover Groups').click();
    }
  });
}

function logInAndOpenGroups() {
  visitLogin();
  cy.get('input[name="email"]').type('jc@uwaterloo.ca');
  cy.get('input[name="password"]').type('Password');
  cy.contains('button', 'Log In').click();
  cy.contains('Home', { timeout: 15000 }).should('be.visible');
  cy.contains('a, button', 'Groups').filter(':visible').first().click();
  cy.url().should('include', '/groups');
  cy.contains('Groups').should('be.visible');
  openDiscoverGroupsTabIfPresent();
}

describe('Groups Feature', () => {
  beforeEach(() => {
    stubGroupsBackend({ invitesBodyOrFn: [] });
    logInAndOpenGroups();
  });

  it('should load the groups page', () => {
    cy.contains('Groups').should('be.visible');
    cy.contains('+ Create Group').should('be.visible');
  });

  it('should have category filter dropdown', () => {
    cy.contains(/Category/i).should('be.visible');
    cy.get('select').first().should('be.visible');
  });

  it('should have search input', () => {
    cy.get(
      'input[placeholder*="Search by group name"], input[placeholder*="Search groups"]',
    ).should('be.visible');
  });

  it('should display at least one group', () => {
    openDiscoverGroupsTabIfPresent();
    cy.contains('h3', 'Cypress Stub Group', { timeout: 15000 }).should('be.visible');
  });

  it('should navigate to create group page', () => {
    cy.contains('+ Create Group').click();
    cy.url().should('include', '/groups/new');
    cy.contains('Create New Group').should('be.visible');
  });
});

describe('Group invitations', () => {
  const inviteStub = [
    { invite_id: 1, group_id: 2, group_name: 'Test Group', inviter_name: 'Test User' },
  ];

  beforeEach(() => {
    // Return invites on every GET. The page refetches (effects/visibility); replying [] after the
    // first call cleared state and removed Accept/Decline from the DOM.
    stubGroupsBackend({
      invitesBodyOrFn: (req) => {
        req.reply({ statusCode: 200, body: inviteStub });
      },
    });
    visitLogin();
    cy.get('input[name="email"]').type('jc@uwaterloo.ca');
    cy.get('input[name="password"]').type('Password');
    cy.contains('button', 'Log In').click();
    cy.contains('Home', { timeout: 15000 }).should('be.visible');
    cy.window().then((win) => {
      if (!win.localStorage.getItem('currentUserId')) {
        win.localStorage.setItem('currentUserId', '1');
      }
    });
    cy.contains('a, button', 'Groups').filter(':visible').first().click();
    cy.url().should('include', '/groups');
    cy.wait('@getInvites');
  });

  it('should show invitation banner when user has pending invites', () => {
    cy.contains('Test User invited you to join', { timeout: 15000 }).should('be.visible');
    cy.contains('Test Group').should('be.visible');
    cy.contains('Accept', { timeout: 15000 }).should('be.visible');
    cy.contains('Decline').should('be.visible');
  });

  it('should show feedback popup when declining an invite', () => {
    cy.intercept('POST', '**/api/invites/*/respond', { statusCode: 200, body: { message: 'Invite declined' } });
    cy.contains('Decline', { timeout: 15000 }).first().click();
    cy.contains(/You have declined the invitation to join group/).should('be.visible');
    cy.contains('Test Group').should('be.visible');
    cy.get('button[aria-label="Close"]').should('be.visible');
  });

  it('should show feedback popup when accepting an invite', () => {
    cy.intercept('POST', '**/api/invites/*/respond', { statusCode: 200, body: { message: 'Invite accepted' } });
    cy.contains('Accept', { timeout: 15000 }).first().click();
    cy.contains(/You have accepted the invitation to join group/).should('be.visible');
  });
});
