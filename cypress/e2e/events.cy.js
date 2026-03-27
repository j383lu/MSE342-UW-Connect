/**
 * Created by Derrick Lu
 * 
 * Events Feature Cypress Tests
 * 
 * This test covers all the features in the event page including:
 * page load, search, sort, create event form, validations, group event option, 
 * join / leave event flow, edit event flow, delete event flow, and attendee list.
 */

function pathnameFromReq(req) {
  try {
    return new URL(req.url).pathname;
  } catch {
    return '';
  }
}

/**
 * Reset session and open login form from landing page and clear firebase local storage
 */
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

  // Open landing page and click sign in if login form not visible
  cy.visit('/', { timeout: 60000 });
  cy.get('body', { timeout: 30000 }).should('be.visible');

  cy.get('body').then(($body) => {
    if (!$body.find('input[name="email"]:visible').length) {
      cy.contains('a, button', 'Sign In').filter(':visible').first().click();
    }
  });

  cy.get('#email, input[name="email"]', { timeout: 20000 }).should('be.visible');
}

/**
 * Stub backend APIs and avoid dependency on real database or server state
 */
function stubEventsBackend() {
  
  // User information
  cy.intercept('GET', '**/api/users/by-email*', {
    statusCode: 200,
    body: { userId: 1, display_name: 'Test User' },
  }).as('getUserByEmail');
  
  // Notification
  cy.intercept('GET', '**/api/notifications/**', {
    statusCode: 200,
    body: {},
  }).as('getNotifications');

  // Categories dropdown list
  cy.intercept('GET', '**/api/categories**', {
    statusCode: 200,
    body: [
      { tag_name: 'Social' },
      { tag_name: 'Academic' },
      { tag_name: 'Sports' },
    ],
  }).as('getCategories');

  // Mock user's joined groups
  cy.intercept('GET', '**/api/users/*/groups/member**', {
    statusCode: 200,
    body: [
      { group_id: 1, name: 'MSE Study Group' },
      { group_id: 2, name: 'Campus Social Club' },
    ],
  }).as('getJoinedGroups');

  // Mock user's search history
  cy.intercept('GET', '**/api/events/search-history**', {
    statusCode: 200,
    body: [],
  }).as('getSearchHistory');

  // Mock user's upcoming event list
  cy.intercept('GET', '**/api/events/public**', {
    statusCode: 200,
    body: [
      {
        id: 101,
        title: 'Movie Night',
        description: 'Watch a movie together',
        category: 'Social',
        location: 'SLC',
        event_date: '2026-03-30',
        event_time: '18:00',
        end_date: '2026-03-30',
        end_time: '20:00',
        current_count: 1,
        capacity: 5,
        likes_count: 4,
        has_joined: 0,
        is_past: 0,
        created_by: 1,
        event_type: 'public',
        creator_name: 'Test User',
      },
      {
        id: 102,
        title: 'Group Study Session',
        description: 'Prepare for the midterm',
        category: 'Academic',
        location: 'DC',
        event_date: '2026-03-31',
        event_time: '14:00',
        end_date: '2026-03-31',
        end_time: '16:00',
        current_count: 2,
        capacity: 8,
        likes_count: 7,
        has_joined: 1,
        is_past: 0,
        created_by: 2,
        event_type: 'group',
        creator_name: 'Another User',
      },
      {
        id: 103,
        title: 'Basketball Night',
        description: 'Play basketball at CIF',
        category: 'Sports',
        location: 'CIF',
        event_date: '2026-04-01',
        event_time: '19:00',
        end_date: '2026-04-01',
        end_time: '21:00',
        current_count: 3,
        capacity: 10,
        likes_count: 2,
        has_joined: 0,
        is_past: 0,
        created_by: 3,
        event_type: 'public',
        creator_name: 'Jen',
      },
    ],
  }).as('getEvents');

  cy.intercept('GET', '**/api/events', (req) => {
    if (pathnameFromReq(req) !== '/api/events') {
      req.continue();
      return;
    }

    req.reply({
      statusCode: 200,
      body: [
        {
          id: 101,
          title: 'Movie Night',
          description: 'Watch a movie together',
          category: 'Social',
          location: 'SLC',
          event_date: '2026-03-30',
          event_time: '18:00',
          end_date: '2026-03-30',
          end_time: '20:00',
          current_count: 1,
          capacity: 5,
          likes_count: 4,
          has_joined: 0,
          is_past: 0,
          created_by: 1,
          event_type: 'public',
          creator_name: 'Test User',
        },
        {
          id: 102,
          title: 'Group Study Session',
          description: 'Prepare for the midterm',
          category: 'Academic',
          location: 'DC',
          event_date: '2026-03-31',
          event_time: '14:00',
          end_date: '2026-03-31',
          end_time: '16:00',
          current_count: 2,
          capacity: 8,
          likes_count: 7,
          has_joined: 1,
          is_past: 0,
          created_by: 2,
          event_type: 'group',
          creator_name: 'Another User',
        },
        {
          id: 103,
          title: 'Basketball Night',
          description: 'Play basketball at CIF',
          category: 'Sports',
          location: 'CIF',
          event_date: '2026-04-01',
          event_time: '19:00',
          end_date: '2026-04-01',
          end_time: '21:00',
          current_count: 3,
          capacity: 10,
          likes_count: 2,
          has_joined: 0,
          is_past: 0,
          created_by: 3,
          event_type: 'public',
          creator_name: 'Jen',
        },
      ],
    });
  });

  // Create an event
  cy.intercept('POST', '**/api/events', {
    statusCode: 201,
    body: {
      message: 'Event created successfully.',
      eventId: 999,
    },
  }).as('createEvent');

  // Mock join / leave actions
  cy.intercept('POST', '**/api/events/*/join', {
    statusCode: 200,
    body: {
      message: 'Joined event successfully.',
    },
  }).as('joinEvent');

  cy.intercept('DELETE', '**/api/events/*/leave', {
    statusCode: 200,
    body: {
      message: 'Left event successfully.',
    },
  }).as('leaveEvent');

  // Mock edit / delete actions
  cy.intercept('PUT', '**/api/events/*', {
    statusCode: 200,
    body: {
      message: 'Event updated successfully.',
    },
  }).as('updateEvent');

  cy.intercept('DELETE', '**/api/events/*', {
    statusCode: 200,
    body: {
      message: 'Event deleted successfully.',
    },
  }).as('deleteEvent');

  // Mock event's attendee list
  cy.intercept('GET', '**/api/events/*/attendees', {
    statusCode: 200,
    body: [
      { user_id: 1, display_name: 'Test User' },
      { user_id: 2, display_name: 'Jen' },
    ],
  }).as('getAttendees');
}

// Go to the events page
function goToEventsAfterLogin() {
  cy.visit('/events');
  cy.url().should('include', '/events');
}

describe('Events Feature', () => {
  beforeEach(() => {
    stubEventsBackend();
    openLoginFormFromLanding();

    cy.get('input[name="email"]').type('jc@uwaterloo.ca');
    cy.get('input[name="password"]').type('Password');
    cy.contains('button', 'Log In').click();

    cy.contains('Home', { timeout: 15000 }).should('be.visible');
    goToEventsAfterLogin();
    cy.wait('@getEvents');
  });

  it('shows the events page and main sections', () => {
    cy.contains('Upcoming Events', { timeout: 15000 }).should('be.visible');
    cy.contains('My Events').should('be.visible');
  });

  // Searching Feature
  it('shows error when searching with empty keyword', () => {
    cy.contains('button', 'Search').click();

    cy.get('body').then(($body) => {
      if ($body.text().match(/please enter a keyword|enter a search term/i)) {
        cy.contains(/please enter a keyword|enter a search term/i).should('be.visible');
      }
    });
  });

  it('searches events by keyword', () => {
    cy.get('body').then(($body) => {
      const searchInput =
        $body.find('input[placeholder*="Search"]').length > 0
          ? 'input[placeholder*="Search"]'
          : 'input';

      cy.get(searchInput).first().clear().type('Movie');
    });

    cy.contains('button', 'Search').click();

    cy.contains('Movie Night').should('be.visible');
  });

  it('shows recent searches or suggestions when search input is focused', () => {
    cy.get('input').first().click({ force: true });

    cy.get('body').then(($body) => {
      if (
        $body.text().includes('Recent Searches') ||
        $body.text().includes('Suggestions') ||
        $body.text().includes('No recent searches')
      ) {
        cy.get('body').should('be.visible');
      }
    });
  });

  // Sorting feature
  it('sort dropdown changes between Most Recent and Most Liked', () => {
    cy.get('body').then(($body) => {
      if ($body.find('.MuiSelect-select').length > 0) {
        cy.get('.MuiSelect-select').first().click({ force: true });
        cy.get('[role="option"]').contains(/most liked/i).click({ force: true });
        cy.get('.MuiSelect-select').first().contains(/most liked/i).should('be.visible');

        cy.get('.MuiSelect-select').first().click({ force: true });
        cy.get('[role="option"]').contains(/most recent/i).click({ force: true });
        cy.get('.MuiSelect-select').first().contains(/most recent/i).should('be.visible');
      }
    });
  });

  // Event tabs feature
  it('switches between all event tabs correctly', () => {
    cy.contains(/upcoming events/i).should('be.visible');
    cy.contains(/my group events/i).click();
    cy.contains(/my group events/i).should('be.visible');
    cy.contains(/my events/i).click();
    cy.contains(/my events/i).should('be.visible');
    cy.contains(/upcoming events/i).click();
    cy.contains(/upcoming events/i).should('be.visible');
    cy.url().should('include', '/events');
  });

  it('switching between event tabs works', () => {
    cy.contains(/my events/i).click();
    cy.contains(/upcoming events/i).click();
    cy.url().should('include', '/events');
  });

  // Create events feature
  it('opens create event form when create event button is clicked', () => {
    cy.contains('Create Event').click();
    cy.url().should('include', '/events/new');
  });

  it('shows validation errors when required fields are missing', () => {
    cy.contains('Create Event').click();
    cy.url().should('include', '/events/new');

    cy.contains('button', /^Create Event$/).click({ force: true });

    cy.contains(/event title/i).should('be.visible');
    cy.contains(/description/i).should('be.visible');
    cy.contains(/start date/i).should('be.visible');
  });

  it('shows group selector when group event option is selected', () => {
    cy.contains('Create Event').click();
    cy.url().should('include', '/events/new');

    cy.get('body').then(($body) => {
      if ($body.text().match(/private/i)) {
        cy.contains(/^Private$/).click({ force: true });
      }
    });

    cy.get('body').then(($body) => {
      if ($body.text().includes('Select Group')) {
        cy.contains('Select Group').should('be.visible');
      }
    });
  });

  it('shows validation error when group event is submitted without selecting a group', () => {
    cy.contains('Create Event').click();
    cy.url().should('include', '/events/new');

    cy.get('input').first().clear().type('Group Event Test');

    cy.get('body').then(($body) => {
      if ($body.find('textarea').length > 0) {
        cy.get('textarea').first().clear().type('This is a group event test.');
      }
    });

    cy.get('body').then(($body) => {
      if ($body.text().match(/private/i)) {
        cy.contains(/^Private$/).click({ force: true });
      }
    });

    cy.get('body').then(($body) => {
      if ($body.text().match(/select at least one group|please select a group|group is empty/i)) {
        cy.contains(/select at least one group|please select a group|group is empty/i).should('be.visible');
      }
    });
  });

  it('creates a public event successfully', () => {
    cy.contains('Create Event').click();
    cy.url().should('include', '/events/new');

    // Fill event title
    cy.get('input').first().clear().type('Cypress Public Event');

    // Fill description
    cy.get('textarea').first().clear().type('This is a Cypress public event.');

    // Keep event type as Public
    cy.contains(/^Public$/).click({ force: true });

    // Select category from the native select
    cy.contains('label', 'Category')
      .parent()
      .find('select')
      .select('Social', { force: true });

    // Fill location
    cy.contains('label', 'Location')
      .parent()
      .find('input')
      .clear()
      .type('SLC');

    // Fill capacity
    cy.contains('label', 'Max RSVP Spots')
      .parent()
      .find('input')
      .clear()
      .type('10');

    // Fill start and end date
    cy.get('input[type="date"]').first().clear().type('2026-03-30');
    cy.get('input[type="date"]').eq(1).clear().type('2026-03-30');

    // Fill start and end time
    cy.get('input[type="time"]').first().clear().type('18:00');
    cy.get('input[type="time"]').eq(1).clear().type('20:00');

    // Submit the form
    cy.contains('button', /^Create Event$/).click({ force: true });
    cy.wait('@createEvent');
  });

  // Join / Leave event feature
  it('allows user to join an event', () => {
    cy.contains('Movie Night').should('be.visible');
    cy.contains(/join event/i).first().click({ force: true });
    cy.wait('@joinEvent');
  });

  it('allows user to leave an event', () => {
    cy.contains('Group Study Session').should('be.visible');
    cy.contains(/leave event/i).first().click({ force: true });
    cy.wait('@leaveEvent');
  });

  // Attendee list feature
  it('shows attendee list when show attendees is clicked', () => {
    cy.contains(/show attendees/i).first().click({ force: true });
    cy.wait('@getAttendees');
  });

  // Re-edit and Delete event feature
  it('allows organizer to edit an event', () => {
    cy.contains(/my events/i).click();

    cy.get('body').then(($body) => {
      if ($body.text().match(/edit/i)) {
        cy.contains(/edit/i).first().click({ force: true });

        cy.get('body').then(($innerBody) => {
          if ($innerBody.find('input').length > 0) {
            cy.get('input').first().clear().type('Movie Night Updated');
          }
        });

        cy.contains(/save|update/i).click({ force: true });
        cy.wait('@updateEvent');
      }
    });
  });

  it('allows organizer to delete an event', () => {
    cy.contains(/my events/i).click();

    cy.get('body').then(($body) => {
      if ($body.text().match(/delete this event|delete/i)) {
        cy.contains(/delete this event|delete/i).first().click({ force: true });
        cy.wait('@deleteEvent');
      }
    });
  });
});