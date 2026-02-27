describe('Profile and EditProfile flows', () => {
  beforeEach(() => {
    // stub profile data
    cy.intercept('GET', '/api/profile', {
      statusCode: 200,
      body: {
        name: 'Alice',
        bio: 'Sample bio',
        program_id: 2,
        program_name: 'Engineering',
        program: 'Engineering', // component uses profile.program
      },
    }).as('getProfile');

    // stub programs
    cy.intercept('GET', '/api/profile/programs', {
      statusCode: 200,
      body: [{ program_id: 2, program_name: 'Engineering' }],
    }).as('getPrograms');

    // stub courses list
    cy.intercept('GET', '/api/profile/courses', {
      statusCode: 200,
      body: [
        { course_id: 1, course_code: 'MATH101' },
        { course_id: 2, course_code: 'CS102' },
      ],
    }).as('getCourses');

    // stub user courses on profile
    cy.intercept('GET', '/api/profile/user-courses', {
      statusCode: 200,
      body: [{ course_id: 1, course_code: 'MATH101' }],
    }).as('getUserCourses');
  });

  it('displays profile information', () => {
    cy.visit('/profile');
    cy.wait('@getProfile');
    cy.wait('@getUserCourses');

    cy.contains('Alice');
    // program is rendered under profile.program
    cy.contains('Engineering', { timeout: 10000 });
    cy.contains('MATH101');
  });

  it('allows editing profile', () => {
    // intercept PUT
    cy.intercept('PUT', '/api/profile', (req) => {
      expect(req.body).to.have.property('name', 'Bob');
      expect(req.body).to.have.property('program_id', 2);
      expect(req.body.courses).to.deep.equal([2]);
      req.reply({ statusCode: 200, body: { ok: true } });
    }).as('putProfile');

    cy.visit('/edit-profile');
    cy.wait('@getProfile');
    cy.wait('@getPrograms');
    cy.wait('@getCourses');

    cy.get('[data-testid="display-name-input"]').clear().type('Bob');
    // open the material-ui select by clicking the visible select container
    cy.get('#program-select').click();
    // select the item from the listbox to avoid backdrop covering
    cy.get('ul[role="listbox"]').contains('Engineering').click();

    cy.get('#courses-select').click();
    cy.contains('CS102').click();
    cy.get('body').click(0,0); // close the dropdown

    cy.contains('Save').click();
    cy.wait('@putProfile');

    // after save should navigate back to profile
    cy.url().should('include', '/profile');
  });
});
