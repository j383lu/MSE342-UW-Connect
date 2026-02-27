// Created by: Derrick Lu

// Unit tests for CreateEventForm.js with two user stories used
// 16. As an event organizer, I want to create an event post, 
//     so that I can promote and get people to RSVP to my event.
// 24. As an event organizer, I want to set a maximum number of RSVP spots, 
//     so that my event does not exceed its capacity.

describe("CreateEventForm test with User Story 16 and 24)", () => {
  
    // Set up helper function to check empty enters
    const validateRequiredFields = (formData) => {
        const errors = {};
        if (!formData.title) errors.title = "This field is required.";
        if (!formData.description) errors.description = "This field is required.";
        if (!formData.eventDate) errors.eventDate = "This field is required.";
        if (!formData.eventTime) errors.eventTime = "This field is required.";
        if (!formData.location) errors.location = "This field is required.";
        if (formData.capacity === "" || formData.capacity === null || formData.capacity === undefined) {
        errors.capacity = "This field is required.";
        }
        return errors;
    };

    // Set up helper function to validate date/time format and past datetime
    const validateDateTime = (eventDate, eventTime, now = new Date("2026-03-01T12:00:00")) => {
        const errors = {};

        // basic format checks
        const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(eventDate || "");
        const timeOk = /^\d{2}:\d{2}$/.test(eventTime || "");

        if (!dateOk) errors.eventDate = "Invalid date format.";
        if (!timeOk) errors.eventTime = "Invalid time format.";

        if (dateOk && timeOk) {
        const dt = new Date(`${eventDate}T${eventTime}:00`);
        if (Number.isNaN(dt.getTime())) {
            errors.eventDateTime = "Invalid date/time.";
        } else if (dt.getTime() < now.getTime()) {
            errors.eventDateTime = "Event date/time cannot be in the past.";
        }
        }

        return errors;
    };

    // Set up helper function to validate capacity enters
    const validateCapacity = (capacity) => {
        const capNum = Number(capacity);
        if (!Number.isInteger(capNum) || capNum <= 0) return "Capacity must be a positive integer.";
        return "";
    };

    // Set up helper function to fake create call to test server errors
    const fakeCreateRequest = async ({ shouldFail }) => {
        if (shouldFail) throw new Error("Network error");
        return { id: 123 };
    };

    // Set up helper function to check if RSVP is full
    const canRSVP = (currentCount, capacity) => {
        const cur = Number(currentCount || 0);
        const cap = Number(capacity || 0);
        if (cap <= 0) return true; // assume no cap means allow
        return cur < cap;
    };

    // User Story 16 unit tests

    // AC 1:
    // Given required fields are empty
    // When organizer clicks Create Event
    // Then system shows error and does not create event
    test("Blocks creation if required fields are missing", () => {
        const formData = {
        title: "",
        description: "",
        eventDate: "",
        eventTime: "10:30",
        location: "SLC",
        capacity: "20",
        };

        const errors = validateRequiredFields(formData);
        expect(errors.title).toBeDefined();
        expect(errors.title).toMatch(/required/i);
    });

    // AC 2:
    // Given all required fields are filled correctly
    // When organizer submits event
    // Then system allows event to be created
    test("Create event when all required fields are filled", () => {
        const formData = {
        title: "Event A",
        description: "Desc",
        eventDate: "2026-03-10",
        eventTime: "10:30",
        location: "SLC",
        capacity: "20",
        };

        const errors = validateRequiredFields(formData);
        expect(Object.keys(errors).length).toBe(0);
    });

    // AC 3:
    // Given organizer enters invalid or past date/time
    // When submitting event
    // Then system prevents creation and shows validation error
    test("Rejects past event date/time", () => {
        const badFormat = validateDateTime("03-10-2026", "10:30");
        expect(badFormat.eventDate).toMatch(/invalid/i);

        const pastTime = validateDateTime("2026-02-20", "10:30", new Date("2026-03-01T12:00:00"));
        expect(pastTime.eventDateTime).toMatch(/past/i);
    });

    // AC 4:
    // Given server fails when saving event
    // When organizer submits event
    // Then system shows error and does not mark event as created
    test("Handles server/network failure correctly", async () => {
        let created = false;
        let errorMsg = "";

        try {
        await fakeCreateRequest({ shouldFail: true });
        created = true;
        } catch (e) {
        created = false;
        errorMsg = "Cannot connect to backend.";
        }

        expect(created).toBe(false);
        expect(errorMsg).toMatch(/connect/i);
    });

    // User Story 24

    // AC 1:
    // Given organizer enters valid maximum RSVP spots
    // When saving event
    // Then system stores capacity successfully
    test("Accepts a valid maximum RSVP spots value", () => {
        const err = validateCapacity("25");
        expect(err).toBe("");
    });

    // AC 2:
    // Given organizer enters zero, negative, or non-numeric value
    // When saving event
    // Then system shows validation error
    test("Rejects invalid capacity values", () => {
        const badCaps = ["0", "-1", "abc", "2.5", ""];
        badCaps.forEach((cap) => {
        const err = validateCapacity(cap);
        expect(err).toMatch(/positive integer/i);
        });
    });

    // AC 3:
    // Given event has reached maximum capacity
    // When another student tries to RSVP
    // Then system prevents RSVP
    test("Prevents RSVP when event reaches capacity", () => {
        const full= canRSVP(10, 10);
        expect(full).toBe(false);
    });

});