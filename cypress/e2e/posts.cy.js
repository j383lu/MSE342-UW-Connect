describe("Post Feed - Create, Search, Filter by Tag", () => {

  beforeEach(() => {
    cy.session('userSession', () => {
      cy.visit('/');
      cy.contains('Sign In').click();
      cy.get('input[name="email"]').type('jc@uwaterloo.ca');
      cy.get('input[name="password"]').type('Password');
      cy.contains('button', 'Log In').click();
      cy.contains('Home', { timeout: 10000 }).should('be.visible');
    });

    cy.visit('/feed');
    cy.url().should('include', '/feed');
  });

  // CREATE
  it("opens create post form when Create Post is clicked", () => {
    cy.contains("Create Post").click();
    cy.contains("Create a New Post").should("be.visible");
  });

  it("shows validation error when submitting with no title", () => {
    cy.contains("Create Post").click();
    cy.get("textarea").first().type("Some description");
    cy.contains("Submit").click();
    cy.contains("Title is a required field").should("be.visible");
  });

  it("shows validation error when submitting with no description", () => {
    cy.contains("Create Post").click();
    cy.contains("label", "Title").siblings("div").find("input").type("Valid Title");
    cy.contains("Submit").click();
    cy.contains("Description is a required field").should("be.visible");
  });

  it("cancelling create form does not add a post", () => {
    cy.contains("Create Post").click();
    cy.contains("label", "Title").siblings("div").find("input").type("Should Not Appear");
    cy.contains("Cancel").click();
    cy.contains("Should Not Appear").should("not.exist");
  });

  // SEARCH
  it("shows error when searching with empty keyword", () => {
    cy.contains("button", "Search").click();
    cy.contains("Please enter a keyword to search").should("be.visible");
  });

 
  // SORT
  it("sort dropdown changes between Most Recent and Most Liked", () => {
    // Default should be Most Recent
    cy.get(".MuiSelect-select").contains("Most recent").should("be.visible");

    // Change to Most Liked
    cy.get(".MuiSelect-select").click();
    cy.get('[role="option"]').contains("Most liked").click();
    cy.get(".MuiSelect-select").contains("Most liked").should("be.visible");

    // Change back to Most Recent
    cy.get(".MuiSelect-select").click();
    cy.get('[role="option"]').contains("Most recent").click();
    cy.get(".MuiSelect-select").contains("Most recent").should("be.visible");
  });

  // MY GROUPS TAB
  it("My Groups tab shows a message when user has no group posts", () => {
    cy.contains("button", "My Groups").click();

    // Either shows group posts or the empty state message
    cy.get("body").then(($body) => {
      if ($body.text().includes("No posts from your groups yet.")) {
        cy.contains("No posts from your groups yet.").should("be.visible");
        cy.contains("Join a group to see their posts here.").should("be.visible");
      } else {
        // User is in groups and has posts — just verify the tab is active
        cy.contains("button", "My Groups").should("be.visible");
      }
    });
  });

  it("switching between All Posts and My Groups tabs works", () => {
    // Start on All Posts
    cy.contains("button", "All posts").should("be.visible");

    // Switch to My Groups
    cy.contains("button", "My Groups").click();

    // Switch back to All Posts
    cy.contains("button", "All posts").click();

    // Feed should still be visible
    cy.url().should("include", "/feed");
  });

});