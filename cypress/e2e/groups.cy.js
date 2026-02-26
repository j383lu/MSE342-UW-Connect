describe('Groups Feature Integration Tests', () => {
  beforeEach(() => {
    // Visit the groups page before each test
    cy.visit('/groups');
    
    // Wait for page to load
    cy.contains('Groups').should('be.visible');
  });

  it('should load and display groups correctly', () => {
    // Check if groups are displayed
    cy.get('h2').contains('Owned Groups').should('be.visible');
    cy.get('h2').contains('My Groups').should('be.visible');
    cy.get('h2').contains('Discover Groups').should('be.visible');
    
    // Check if at least one group card is visible
    cy.get('[data-testid="group-card"]').should('have.length.at.least', 1);
  });

  it('should filter groups by category', () => {
    // Select a category from dropdown
    cy.get('select').first().select('Academic');
    
    // Wait for filtered results
    cy.get('[data-testid="group-card"]').should('exist');
    
    // Verify that all visible groups have the selected category
    cy.get('[data-testid="group-category"]').each(($el) => {
      expect($el.text()).to.equal('Academic');
    });
  });

  it('should search for groups', () => {
    const searchTerm = 'Soccer';
    
    // Type in search input
    cy.get('input[placeholder*="Search groups"]').type(searchTerm);
    
    // Wait for search results
    cy.get('[data-testid="group-card"]').should('exist');
    
    // Verify search results contain the search term
    cy.get('[data-testid="group-name"]').each(($el) => {
      expect($el.text().toLowerCase()).to.include(searchTerm.toLowerCase());
    });
  });

  it('should navigate to group details when clicking a group', () => {
    // Click on the first group card
    cy.get('[data-testid="group-card"]').first().click();
    
    // Verify we're on the group details page
    cy.url().should('include', '/groups/');
    cy.contains('Back to Groups').should('be.visible');
    cy.get('h1').should('be.visible');
  });

  it('should join a group from discover section', () => {
    // Find a join button in discover section and click it
    cy.get('section').contains('Discover Groups')
      .parent()
      .find('button:contains("Join")')
      .first()
      .click();
    
    // Button should change to "Leave"
    cy.get('button:contains("Leave")').should('be.visible');
    
    // Group should appear in "My Groups" section
    cy.get('section').contains('My Groups')
      .parent()
      .find('[data-testid="group-card"]')
      .should('exist');
  });

  it('should leave a group from my groups section', () => {
    // First join a group
    cy.get('section').contains('Discover Groups')
      .parent()
      .find('button:contains("Join")')
      .first()
      .click();
    
    // Wait for join to complete
    cy.get('button:contains("Leave")').should('be.visible');
    
    // Click leave button
    cy.get('button:contains("Leave")').first().click();
    
    // Button should change back to "Join"
    cy.get('button:contains("Join")').should('be.visible');
    
    // Group should disappear from "My Groups"
    cy.get('section').contains('My Groups')
      .parent()
      .find('[data-testid="group-card"]')
      .should('not.exist');
  });

  it('should create a new group', () => {
    // Click create group button
    cy.contains('+ Create Group').click();
    
    // Verify we're on create group page
    cy.url().should('include', '/groups/new');
    cy.contains('Create New Group').should('be.visible');
    
    // Fill out the form
    cy.get('input[placeholder*="Study Group"]').type('Cypress Test Group');
    cy.get('textarea[placeholder*="Describe your group"]').type('This is a test group created by Cypress');
    cy.get('select').first().select('Academic');
    cy.contains('Public').click();
    cy.get('input[type="number"]').type('25');
    
    // Submit the form
    cy.contains('Create Group').click();
    
    // Verify we're redirected to the new group page
    cy.url().should('include', '/groups/');
    cy.contains('Cypress Test Group').should('be.visible');
  });

  it('should edit a group (as owner)', () => {
    // Go to owned groups section
    cy.get('section').contains('Owned Groups')
      .parent()
      .find('[data-testid="group-card"]')
      .first()
      .within(() => {
        // Click on the group to go to details
        cy.get('h3').click();
      });
    
    // Click edit button
    cy.contains('Edit Group').click();
    
    // Verify we're on edit page
    cy.url().should('include', '/edit');
    cy.contains('Edit Group').should('be.visible');
    
    // Update group name
    cy.get('input[placeholder*="Study Group"]').clear().type('Updated Cypress Group');
    
    // Save changes
    cy.contains('Save Changes').click();
    
    // Verify changes are saved
    cy.contains('Updated Cypress Group').should('be.visible');
  });

  it('should display member list correctly', () => {
    // Navigate to a group details page
    cy.get('[data-testid="group-card"]').first().click();
    
    // Check member section
    cy.contains('Members').should('be.visible');
    
    // Verify member cards are displayed
    cy.get('[data-testid="member-card"]').should('have.length.at.least', 1);
    
    // Check for owner badge
    cy.contains('👑 Owner').should('be.visible');
  });

  it('should maintain state after page refresh', () => {
    // Join a group
    cy.get('section').contains('Discover Groups')
      .parent()
      .find('button:contains("Join")')
      .first()
      .click();
    
    cy.get('button:contains("Leave")').should('be.visible');
    
    // Refresh the page
    cy.reload();
    
    // Verify join state is preserved
    cy.get('button:contains("Leave")').should('be.visible');
  });

  it('should handle private groups correctly', () => {
    // Find a private group (if any)
    cy.get('[data-testid="group-privacy"]').each(($el) => {
      if ($el.text().includes('Private')) {
        // Verify join button is disabled
        cy.wrap($el).parents('[data-testid="group-card"]')
          .find('button:contains("Join")')
          .should('be.disabled');
      }
    });
  });

  it('should display correct member counts', () => {
    cy.get('[data-testid="group-card"]').first().within(() => {
      // Get member count text
      cy.get('[data-testid="member-count"]').invoke('text').then((text) => {
        const count = parseInt(text.match(/\d+/)[0]);
        expect(count).to.be.at.least(0);
      });
    });
  });

  it('should navigate correctly using back button', () => {
    // Go to group details
    cy.get('[data-testid="group-card"]').first().click();
    
    // Click back button
    cy.contains('Back to Groups').click();
    
    // Verify we're back on groups page
    cy.url().should('not.include', '/groups/');
    cy.contains('Groups').should('be.visible');
  });
});