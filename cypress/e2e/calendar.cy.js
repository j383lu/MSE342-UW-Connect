/**
 * Calendar / Events page — no fake “stub” event titles; only UI shell + real-app expectations.
 * Set CYPRESS_CALENDAR_PATH if your calendar is not at `/events`.
 */

function pathnameFromReq(req) {
  try {
    return new URL(req.url).pathname;
  } catch {
    return '';
  }
}

/** Keep noisy endpoints from 500ing in CI; return empty data (no invented event titles). */
function stubCalendarBackend() {
  cy.intercept('GET', '**/api/users/by-email*', { statusCode: 200, body: { userId: 1 } });
  cy.intercept('GET', '**/api/events/public**', { statusCode: 200, body: [] });
  cy.intercept('GET', '**/api/events/search-history**', { statusCode: 200, body: [] });
  cy.intercept('GET', '**/api/notifications/**', { statusCode: 200, body: {} });
  cy.intercept('GET', '**/api/events', (req) => {
    if (pathnameFromReq(req) !== '/api/events') {
      req.continue();
      return;
    }
    req.reply({ statusCode: 200, body: [] });
  });
}

function goToCalendarAfterLogin() {
  const path = Cypress.env('CALENDAR_PATH') || '/events';
  cy.visit(path);
  cy.url().should('include', path.replace(/\?.*$/, ''));
}

/** Landing page on `/` → click Sign In; then email/password form (also clears Firebase session). */
function openLoginFormFromLanding() {
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
  cy.visit('/', { timeout: 60000 });
  cy.get('body', { timeout: 30000 }).should('be.visible');
  cy.get('body').then(($body) => {
    if (!$body.find('input[name="email"]:visible').length) {
      cy.contains('a, button', 'Sign In').filter(':visible').first().click();
    }
  });
  cy.get('#email, input[name="email"]', { timeout: 20000 }).should('be.visible');
}

describe('Calendar Feature', () => {
  beforeEach(() => {
    stubCalendarBackend();
    openLoginFormFromLanding();
    cy.get('input[name="email"]').type('jc@uwaterloo.ca');
    cy.get('input[name="password"]').type('Password');
    cy.contains('button', 'Log In').click();
    cy.contains('Home', { timeout: 15000 }).should('be.visible');
    goToCalendarAfterLogin();
  });

  it('shows calendar shell with overdue/upcoming sections', () => {
    cy.contains('Upcoming Events', { timeout: 20000 }).should('be.visible');
    cy.contains('Past Events').should('be.visible');
  });

  it('does not show Cypress fixture event titles', () => {
    cy.contains('Stub Campus Event').should('not.exist');
    cy.contains('Ended Stub Event').should('not.exist');
  });
});
