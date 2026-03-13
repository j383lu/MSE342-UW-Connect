describe("Post Feed - Create, Search, Filter by Tag", () => {

  beforeEach(() => {
    cy.visit("/");

    // login
    cy.get('input[name="email"]').type('jc@uwaterloo.ca');
    cy.get('input[name="password"]').type('Password');

    cy.contains('button', 'Log In').click();

    // wait for Firebase login
    cy.contains('Home', { timeout: 10000 }).should('be.visible');

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
    cy.get("input[name='title']").type("Valid Title");
    cy.contains("Submit").click();
    cy.contains("Description is a required field").should("be.visible");
  });

  it("cancelling create form does not add a post", () => {
    cy.contains("Create Post").click();
    cy.get("input[name='title']").type("Should Not Appear");
    cy.contains("Cancel").click();
    cy.contains("Should Not Appear").should("not.exist");
  });

  // SEARCH
  it("shows error when searching with empty keyword", () => {
    cy.contains("button", "Search").click();
    cy.contains("Please enter a keyword to search").should("be.visible");
  });

  // TAG FILTER
  it("shows filtering indicator when a tag is clicked", () => {
    cy.get(".MuiChip-root").first().click();
    cy.contains("Filtering by:").should("be.visible");
  });

  it("clears tag filter when the chip delete button is clicked", () => {
    cy.get(".MuiChip-root").first().click();
    cy.contains("Filtering by:").should("be.visible");
    cy.get(".MuiChip-deleteIcon").click();
    cy.contains("Filtering by:").should("not.exist");
  });

  it("resets to full feed when Reset is clicked while filtering by tag", () => {
    cy.get(".MuiChip-root").first().click();
    cy.contains("Filtering by:").should("be.visible");
    cy.contains("button", "Reset").click();
    cy.contains("Filtering by:").should("not.exist");
  });
});