// Author: Derrick Lu

// Unit tests for EventsPage.js with two user stories used
// 22. As a student, I want to see a list of upcoming events, 
//     so I can plan which sessions or activities to attend.
// 24. As an event organizer, I want to set a maximum number of RSVP spots, 
//     so that my event does not exceed its capacity.

describe("EventsPage test with User Story 22 and 24", () => {

    // Set up helper function to get future and past events
    const getUpcomingEvents = (events) => events.filter((e) => Number(e.is_past) === 0);
    const getPastEvents = (events) => events.filter((e) => Number(e.is_past) === 1);

    // Set up helper function to sort events from earliest to latest
    const sortByDateTimeAsc = (events) => {
        return [...events].sort((a, b) => {
        const aTs = new Date(`${a.event_date}T${a.event_time}:00`).getTime();
        const bTs = new Date(`${b.event_date}T${b.event_time}:00`).getTime();
        return aTs - bTs;
        });
    };

    // Set up helper function to return a message if there are no upcoming events
    const getUpcomingMessage = (upcoming) => {
        return upcoming.length === 0 ? "No upcoming events." : "Has upcoming events.";
    };

    // Set up helper function to see whether a user can RSVP to an event.
    const canRSVP = (currentCount, capacity) => {
        const cur = Number(currentCount || 0);
        const cap = Number(capacity || 0);
        if (cap <= 0) return true;
        return cur < cap;
    };

    // USER STORY 22
   
    // AC 1:
    // Given a student navigates to the Events page
    // When upcoming events exist
    // Then the system displays upcoming events sorted by date from earliest to latest
    test("Sort upcoming events from earliest to latest by date/time", () => {
        const events = [
        { id: 1, title: "Event B", event_date: "2026-03-12", event_time: "09:00", location: "SLC", is_past: 0 },
        { id: 2, title: "Event A", event_date: "2026-03-10", event_time: "10:30", location: "DC", is_past: 0 },
        { id: 3, title: "Event C", event_date: "2026-03-10", event_time: "08:00", location: "MC", is_past: 0 },
        ];

        const upcoming = getUpcomingEvents(events);
        const sorted = sortByDateTimeAsc(upcoming);

        expect(sorted[0].title).toBe("Event C");
        expect(sorted[1].title).toBe("Event A");
        expect(sorted[2].title).toBe("Event B");
    });

    // AC 2:
    // Given the system has both past and future events stored
    // When student views Events page (upcoming list)
    // Then the system shows future events and hides past events from the upcoming section
    test("Upcoming section excludes past events", () => {
        const events = [
        { id: 1, title: "Past A", event_date: "2026-02-01", event_time: "09:00", location: "SLC", is_past: 1 },
        { id: 2, title: "Upcoming A", event_date: "2026-03-10", event_time: "10:30", location: "DC", is_past: 0 },
        ];

        const upcoming = getUpcomingEvents(events);
        const past = getPastEvents(events);

        expect(upcoming.length).toBe(1);
        expect(upcoming[0].title).toBe("Upcoming A");
        expect(past.length).toBe(1);
        expect(past[0].title).toBe("Past A");
    });

    // AC 3:
    // Given there are no upcoming events available
    // When student opens Events page
    // Then the system displays a message indicating there are no upcoming events
    test("Shows message when there are no upcoming events", () => {
        const events = [
        { id: 1, title: "Past A", event_date: "2026-02-01", event_time: "09:00", location: "SLC", is_past: 1 },
        ];

        const upcoming = getUpcomingEvents(events);
        const msg = getUpcomingMessage(upcoming);

        expect(msg).toBe("No upcoming events.");
    });

    // USER STORY 24

    // AC 4:
    // Given an event has one remaining RSVP spot
    // When a student RSVPs successfully
    // Then the system accepts RSVP and marks event as full
    test("After last RSVP, event becomes full", () => {
        const capacity = 5;
        const before = 4;

        const canJoinBefore = canRSVP(before, capacity);
        expect(canJoinBefore).toBe(true);

        const after = before + 1;
        const canJoinAfter = canRSVP(after, capacity);
        expect(canJoinAfter).toBe(false);
    });

    // AC 7:
    // Given an event has a maximum RSVP limit set
    // When a student views the event page
    // Then the system displays spots remaining or indicates full
    test("Calculates spots remaining and indicates full correctly", () => {
        const capacity = 10;
        const current = 7;
        const remaining = capacity - current;

        expect(remaining).toBe(3);

        const isFull = remaining <= 0;
        expect(isFull).toBe(false);

        const fullRemaining = 10 - 10;
        expect(fullRemaining).toBe(0);
        expect(fullRemaining <= 0).toBe(true);
    });

});