describe("Calendar Feature", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/api/users/by-email*", { statusCode: 200, body: { userId: 1 } }).as("byEmail");
    cy.intercept("GET", "**/api/notifications/unread-count*", { statusCode: 200, body: { unreadCount: 0 } });
    cy.intercept("GET", "**/api/calendar/contacts", {
      statusCode: 200,
      body: [
        { user_id: 2, email: "jane@uwaterloo.ca", display_name: "Jane Smith" },
        { user_id: 3, email: "david@uwaterloo.ca", display_name: "David Brown" },
      ],
    }).as("contacts");
    cy.intercept("GET", "**/api/calendar/events*", {
      statusCode: 200,
      body: [
        {
          id: 101,
          title: "Calendar Group Event",
          description: "Test event",
          event_date: "2026-03-25",
          event_time: "18:30",
          end_date: "2026-03-25",
          end_time: "19:30",
          category: "Sports",
          created_by: 1,
          creator_name: "You",
          tags: "__calendar__,__calscope__:group,__calvisibility__:public,__calcolor__:blue",
          is_past: 0,
          is_overdue: 0,
        },
      ],
    }).as("events");
    cy.intercept("GET", "**/api/categories", {
      statusCode: 200,
      body: [{ tag_name: "Sports" }, { tag_name: "Clubs" }],
    }).as("categories");
    cy.intercept("POST", "**/api/calendar/todos", (req) => {
      req.reply({ statusCode: 201, body: { id: 999, message: "Event created successfully." } });
    }).as("createCalendarEvent");

    cy.visit("/");
    cy.get('input[name="email"]').type("jc@uwaterloo.ca");
    cy.get('input[name="password"]').type("Password");
    cy.contains("button", "Log In").click();
    cy.contains("Home", { timeout: 10000 }).should("be.visible");
    cy.contains("Calendar").click();
    cy.url().should("include", "/calendar");
    cy.wait("@contacts");
    cy.wait("@events");
  });

  it("shows calendar shell with overdue/upcoming sections", () => {
    cy.contains("Calendar").should("be.visible");
    cy.contains("Overdue").should("be.visible");
    cy.contains("Upcoming").should("be.visible");
  });

  it("creates a private group calendar event", () => {
    cy.contains("button", "+ Add Event").click();
    cy.contains("Add New Event").should("be.visible");
    cy.get('input[placeholder*="Math Assignment"]').type("Private Group Calendar Event");
    cy.get('textarea[placeholder*="details"]').type("Visible to selected attendees only");
    cy.contains("button", "Group").click();
    cy.contains("Group visibility").should("be.visible");
    cy.contains("button", "Private").click();
    cy.contains("Attendees").should("be.visible");
    cy.contains("Jane Smith").click();
    cy.contains("button", "Add Event").click();
    cy.wait("@createCalendarEvent")
      .its("request.body")
      .then((body) => {
        expect(body.scope).to.equal("group");
        expect(body.visibility).to.equal("private");
        expect(body.participant_user_ids).to.include(2);
      });
  });
});

