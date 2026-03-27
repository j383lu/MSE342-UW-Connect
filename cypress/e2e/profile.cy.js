describe('Profile and EditProfile flows', () => {
  const openLoginFormFromLanding = () => {
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
  };

  const goToProfile = () => {
    cy.contains('Profile', { timeout: 10000 }).click();
    cy.wait('@getProfile');
    cy.wait('@getUserCourses');
    cy.url().should('include', '/profile');
  };

  beforeEach(() => {
    // stub profile data
    cy.intercept('GET', '/api/profile', {
      statusCode: 200,
      body: {
        name: 'Alice',
        bio: 'Sample bio',
        gender: 'Woman',
        birthday: '2005-12-19',
        phone_number: '519-555-1234',
        role: 'Student',
        department: '',
        program_id: 1,
        program_name: 'Management Engineering',
        program: 'Management Engineering',
        courses: [1],
      },
    }).as('getProfile');

    // stub programs
    cy.intercept('GET', '/api/profile/programs', {
      statusCode: 200,
      body: [{ program_id: 1, program_name: 'Management Engineering' }],
    }).as('getPrograms');

    // stub courses list
    cy.intercept('GET', '/api/profile/courses', {
      statusCode: 200,
      body: [
        { course_id: 1, course_code: 'MSE342' },
        { course_id: 2, course_code: 'STAT231' },
        { course_id: 3, course_code: 'MSCI211' },
      ],
    }).as('getCourses');

    // stub user courses on profile
    cy.intercept('GET', '/api/profile/user-courses', {
      statusCode: 200,
      body: [
        { course_id: 1, course_code: 'MSE342' },
        { course_id: 2, course_code: 'STAT231' },
      ],
    }).as('getUserCourses');

    // stub program students page
    cy.intercept('GET', '/api/profile/programs/1/students', {
      statusCode: 200,
      body: {
        program_name: 'Management Engineering',
        students: [
          {
            user_id: 1,
            display_name: 'Alice',
            bio: 'Sample bio',
            role: 'Student',
            program_name: 'Management Engineering',
            courses: [
              { course_id: 1, course_code: 'MSE342' },
              { course_id: 2, course_code: 'STAT231' },
            ],
          },
          {
            user_id: 2,
            display_name: 'Jordan Lee',
            bio: 'Registrar staff member',
            role: 'Staff',
            program_name: 'Management Engineering',
            courses: [],
          },
        ],
      },
    }).as('getProgramStudents');

    // stub profile search for empty + typed queries
    cy.intercept('GET', '/api/profile/search-users*', (req) => {
      const query = (req.query.query || '').toLowerCase();

      const allUsers = [
        {
          user_id: 1,
          display_name: 'Alice',
          email: 'alice@uwaterloo.ca',
          bio: 'Sample bio',
          role: 'Student',
          program_name: 'Management Engineering',
          department: '',
        },
        {
          user_id: 2,
          display_name: 'Jordan Lee',
          email: 'jordan.lee@uwaterloo.ca',
          bio: 'Registrar staff member',
          role: 'Staff',
          program_name: '',
          department: 'Registrar',
        },
        {
          user_id: 3,
          display_name: 'Sarah Patel',
          email: 'sarah.patel@uwaterloo.ca',
          bio: 'Interested in UX',
          role: 'Student',
          program_name: 'Management Engineering',
          department: '',
        },
      ];

      const filteredUsers = query
        ? allUsers.filter((user) => {
            const q = query;
            const name = user.display_name.toLowerCase();
            const email = (user.email || '').toLowerCase();
            return name.includes(q) || email.includes(q);
          })
        : allUsers;

      req.reply({
        statusCode: 200,
        body: {
          users: filteredUsers,
        },
      });
    }).as('searchUsers');

    cy.intercept('GET', '**/api/users/by-email*', {
      statusCode: 200,
      body: { userId: 1, display_name: 'Alice' },
    }).as('getUserByEmail');

    cy.intercept('GET', '**/api/notifications/**', {
      statusCode: 200,
      body: {},
    }).as('getNotifications');

    // login first
    openLoginFormFromLanding();

    cy.get('input[name="email"]').type('jc@uwaterloo.ca');
    cy.get('input[name="password"]').type('Password');

    cy.contains('button', 'Log In').click();

    cy.contains('Home', { timeout: 10000 }).should('be.visible');
  });

  it('displays profile information', () => {
    goToProfile();

    cy.contains('Alice');
    cy.contains('Management Engineering', { timeout: 10000 });
    cy.contains('MSE342');
    cy.contains('STAT231');
  });

  it('allows editing profile', () => {
    cy.intercept('PUT', '/api/profile', (req) => {
      expect(req.body).to.have.property('name', 'Bob');
      expect(req.body).to.have.property('program_id', 1);
      expect(req.body.courses).to.include(2);

      req.reply({ statusCode: 200, body: { ok: true } });
    }).as('putProfile');

    goToProfile();

    cy.contains('Edit Profile').click();
    cy.wait('@getPrograms');
    cy.wait('@getCourses');
    cy.url().should('include', '/edit-profile');

    cy.get('[data-testid="display-name-input"]').clear().type('Bob');

    cy.get('#program-select').click();
    cy.get('ul[role="listbox"]').contains('Management Engineering').click();

    cy.get('#courses-select').click();
    cy.get('ul[role="listbox"]').contains('STAT231').click();
    cy.get('body').click(0, 0);

    cy.contains('Save').click();
    cy.wait('@putProfile');

    cy.url().should('include', '/profile');
  });

  it('shows an error message when saving the profile fails', () => {
    cy.intercept('PUT', '/api/profile', {
      statusCode: 500,
      body: { error: 'Failed to save profile.' },
    }).as('putProfileFail');

    goToProfile();

    cy.contains('Edit Profile').click();
    cy.wait('@getPrograms');
    cy.wait('@getCourses');
    cy.url().should('include', '/edit-profile');

    cy.get('[data-testid="display-name-input"]').clear().type('Bob');
    cy.contains('Save').click();

    cy.wait('@putProfileFail');
    cy.contains('Failed to save profile.');
    cy.url().should('include', '/edit-profile');
  });

  it('displays gender, birthday, and phone number on the profile page', () => {
    goToProfile();

    cy.contains('Alice');
    cy.contains('Woman');
    cy.contains('Birthday: 12/19/2005');
    cy.contains('Phone Number: 519-555-1234');
  });

  it('shows empty-state text when bio, program, and courses are missing', () => {
    cy.intercept('GET', '/api/profile', {
      statusCode: 200,
      body: {
        name: 'Alice',
        bio: '',
        gender: '',
        birthday: null,
        phone_number: '',
        role: 'Student',
        department: '',
        program_id: null,
        program_name: '',
        program: '',
        courses: [],
      },
    }).as('getEmptyProfile');

    cy.intercept('GET', '/api/profile/user-courses', {
      statusCode: 200,
      body: [],
    }).as('getEmptyUserCourses');

    cy.contains('Profile', { timeout: 10000 }).click();
    cy.wait('@getEmptyProfile');
    cy.wait('@getEmptyUserCourses');
    cy.url().should('include', '/profile');

    cy.contains('No bio added yet.');
    cy.contains('No program added yet.');
    cy.contains('No courses added yet.');
  });

  it('does not display gender when it is Prefer not to say', () => {
    cy.intercept('GET', '/api/profile', {
      statusCode: 200,
      body: {
        name: 'Alice',
        bio: 'Sample bio',
        gender: 'Prefer not to say',
        birthday: '2005-12-19',
        phone_number: '519-555-1234',
        role: 'Student',
        department: '',
        program_id: 1,
        program_name: 'Management Engineering',
        program: 'Management Engineering',
        courses: [1],
      },
    }).as('getProfileNoGender');

    cy.contains('Profile', { timeout: 10000 }).click();
    cy.wait('@getProfileNoGender');
    cy.wait('@getUserCourses');
    cy.url().should('include', '/profile');

    cy.contains('Alice');
    cy.contains('Birthday: 12/19/2005');
    cy.contains('Phone Number: 519-555-1234');
    cy.contains('Prefer not to say').should('not.exist');
  });

  it('shows an error message when the profile fails to load', () => {
    cy.intercept('GET', '/api/profile', {
      statusCode: 500,
      body: { error: 'Failed to fetch profile' },
    }).as('getProfileFail');

    cy.contains('Profile', { timeout: 10000 }).click();
    cy.wait('@getProfileFail');

    cy.contains('Profile failed to load.');
  });

  it('routes to the program students page when the program chip is clicked', () => {
    goToProfile();

    cy.contains('Management Engineering').click();

    cy.url().should('include', '/programs/1/students');
    cy.wait('@getProgramStudents');
    cy.contains('Program Students');
    cy.contains('Management Engineering');
  });

  it('shows people and their current courses on the program students page', () => {
    goToProfile();

    cy.contains('Management Engineering').click();
    cy.url().should('include', '/programs/1/students');
    cy.wait('@getProgramStudents');

    cy.contains('Alice');
    cy.contains('Jordan Lee');
    cy.contains('Student');
    cy.contains('Staff');
    cy.contains('MSE342');
    cy.contains('STAT231');
    cy.contains('No courses listed.');
  });

  it('shows all users on the profile search page when the search bar is empty', () => {
    goToProfile();

    cy.contains('Profile Search').click();
    cy.url().should('include', '/profile-search');
    cy.wait('@searchUsers');

    cy.contains('Search Users');
    cy.contains('Alice');
    cy.contains('Jordan Lee');
    cy.contains('Sarah Patel');
  });

  it('filters the profile search list when text is entered', () => {
    goToProfile();

    cy.contains('Profile Search').click();
    cy.url().should('include', '/profile-search');
    cy.wait('@searchUsers');

    cy.get('[data-testid="user-search-input"]').type('Alice');

    cy.wait('@searchUsers');
    cy.contains('Alice');
    cy.contains('Jordan Lee').should('not.exist');
    cy.contains('Sarah Patel').should('not.exist');
  });

  it('filters the profile search list by email', () => {
    goToProfile();

    cy.contains('Profile Search').click();
    cy.url().should('include', '/profile-search');
    cy.wait('@searchUsers');

    cy.get('[data-testid="user-search-input"]').type('jordan.lee@uwaterloo.ca');

    cy.wait('@searchUsers');
    cy.contains('Jordan Lee');
    cy.contains('Alice').should('not.exist');
    cy.contains('Sarah Patel').should('not.exist');
  });

  it('shows staff department in profile search results for staff users', () => {
    goToProfile();

    cy.contains('Profile Search').click();
    cy.url().should('include', '/profile-search');
    cy.wait('@searchUsers');

    cy.contains('Jordan Lee');
    cy.contains('Registrar');
  });
});
