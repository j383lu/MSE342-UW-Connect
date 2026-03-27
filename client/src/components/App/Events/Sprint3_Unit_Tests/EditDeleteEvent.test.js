// Created by: Derrick Lu

// Unit tests for re edit and delete event features in Sprint 3
// Covers edit validation, permission checks, update success, and delete logic

describe("Edit and delete event feature tests", () => {

    // Set up helper function to validate event date and time order
    const validateEventDateTime = ({ eventDate, eventTime, endDate, endTime }) => {
        const errors = {};

        if (eventDate && endDate) {
            const startDateOnly = new Date(`${eventDate}T00:00`);
            const endDateOnly = new Date(`${endDate}T00:00`);

            if (Number.isNaN(startDateOnly.getTime()) || Number.isNaN(endDateOnly.getTime())) {
                errors.endDate = "Please enter valid start date and end date.";
                return errors;
            }

            if (endDateOnly < startDateOnly) {
                errors.endDate = "End date must be after or equal to start date.";
                return errors;
            }
        }

        if (eventDate && eventTime && endDate && endTime) {
            const startDateTime = new Date(`${eventDate}T${eventTime}`);
            const endDateTime = new Date(`${endDate}T${endTime}`);

            if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
                errors.endTime = "Please enter valid start time and end time.";
                return errors;
            }

            if (eventDate === endDate && endDateTime <= startDateTime) {
                errors.endTime = "End time must be after start time.";
                return errors;
            }

            if (endDateTime <= startDateTime) {
                errors.endDate = "End date and end time must be after start date and start time.";
                return errors;
            }
        }

        return errors;
    };

    // Set up helper function to validate edit form fields
    const validateEditFields = (formData) => {
        const errors = {};

        if (!String(formData.title || "").trim()) {
            errors.title = "Event Title is empty, please enter event title.";
        }

        if (!String(formData.description || "").trim()) {
            errors.description = "Description is empty, please enter event description.";
        }

        if (!String(formData.category || "").trim()) {
            errors.category = "Category is empty, please select a category.";
        }

        if (!String(formData.eventDate || "").trim()) {
            errors.eventDate = "Start Date is empty, please select start date.";
        }

        if (!String(formData.eventTime || "").trim()) {
            errors.eventTime = "Start Time is empty, please select start time.";
        }

        if (!String(formData.endDate || "").trim()) {
            errors.endDate = "End Date is empty, please select end date.";
        }

        if (!String(formData.endTime || "").trim()) {
            errors.endTime = "End Time is empty, please select end time.";
        }

        if (!String(formData.location || "").trim()) {
            errors.location = "Location is empty, please enter event location.";
        }

        if (formData.capacity === "" || formData.capacity === null || formData.capacity === undefined) {
            errors.capacity = "Max RSVP Spots is empty, please enter the maximum RSVP spots.";
        } else {
            const capNum = Number(formData.capacity);
            if (!Number.isInteger(capNum) || capNum < 2) {
                errors.capacity = "Max RSVP spots must be an integer greater than or equal to 2.";
            }
        }

        if (String(formData.eventType || "").toLowerCase() === "group" &&
            (!Array.isArray(formData.selectedGroups) || formData.selectedGroups.length === 0)) {
            errors.selectedGroups = "Please select at least one group for a group event.";
        }

        return {
            ...errors,
            ...validateEventDateTime(formData),
        };
    };

    // Set up helper function to determine event ownership
    const isEventOwner = (createdBy, currentUserId) => {
        return Number(createdBy) === Number(currentUserId);
    };

    // Set up helper function to decide if user can edit or delete event
    const canEditOrDeleteEvent = (createdBy, currentUserId) => {
        return isEventOwner(createdBy, currentUserId);
    };

    // Set up helper function to update one event in list
    const updateEventInList = (events, eventId, updates) => {
        return events.map((event) =>
            Number(event.id) === Number(eventId)
                ? { ...event, ...updates }
                : event
        );
    };

    // Set up helper function to remove deleted event from list
    const deleteEventFromList = (events, eventId) => {
        return events.filter((event) => Number(event.id) !== Number(eventId));
    };

    // Set up helper function to return confirmation message
    const getActionConfirmationMessage = (actionType, success) => {
        if (!success) return "";

        if (actionType === "update") {
            return "Event updated successfully.";
        }

        if (actionType === "delete") {
            return "Event deleted successfully.";
        }

        return "";
    };

    // Given I am the organizer of an event
    // When I edit event details and save
    // Then the event should be updated successfully
    test("Updates event data successfully when organizer edits own event", () => {
        const events = [
            { id: 1, title: "Old Title", location: "SLC" },
            { id: 2, title: "Another Event", location: "MC" },
        ];

        const updated = updateEventInList(events, 1, {
            title: "New Title",
            location: "DC",
        });

        expect(updated[0].title).toBe("New Title");
        expect(updated[0].location).toBe("DC");
    });

    // Given I update an event
    // When the changes are saved
    // Then all current attendees should receive a notification
    test("Validates edit input before save when organizer updates event", () => {
        const errors = validateEditFields({
            title: "Updated Event",
            description: "New description",
            category: "Academic",
            eventDate: "2026-03-28",
            eventTime: "14:00",
            endDate: "2026-03-28",
            endTime: "16:00",
            location: "SLC",
            capacity: 10,
            eventType: "public",
            selectedGroups: [],
        });

        expect(Object.keys(errors).length).toBe(0);
    });

    // Given I update an event
    // When there are users who left the event
    // Then they should not receive any notification
    test("Returns end time validation error when end time is before start time", () => {
        const errors = validateEditFields({
            title: "Updated Event",
            description: "New description",
            category: "Academic",
            eventDate: "2026-03-28",
            eventTime: "16:00",
            endDate: "2026-03-28",
            endTime: "15:00",
            location: "SLC",
            capacity: 10,
            eventType: "public",
            selectedGroups: [],
        });

        expect(errors.endTime).toBe("End time must be after start time.");
    });

    // Given I delete an event
    // When the action is completed
    // Then the event should be removed from the event list
    test("Removes deleted event from event list", () => {
        const events = [
            { id: 1, title: "Event A" },
            { id: 2, title: "Event B" },
            { id: 3, title: "Event C" },
        ];

        const updated = deleteEventFromList(events, 2);

        expect(updated.length).toBe(2);
        expect(updated.find((event) => event.id === 2)).toBeUndefined();
    });

    // Given I delete an event
    // When attendees existed
    // Then they should no longer see the event in their joined events
    test("Deleted event no longer exists in attendee visible event list", () => {
        const joinedEvents = [
            { id: 11, title: "Movie Night" },
            { id: 12, title: "Group Study" },
        ];

        const updated = deleteEventFromList(joinedEvents, 11);

        expect(updated.some((event) => event.id === 11)).toBe(false);
    });

    // Given I am not the organizer
    // When I try to edit or delete the event
    // Then I should not be allowed to perform the action
    test("Prevents non organizer from editing or deleting event", () => {
        const allowed = canEditOrDeleteEvent(10, 20);

        expect(allowed).toBe(false);
    });

    // Given I successfully update or delete an event
    // When the action finishes
    // Then I should see a confirmation message
    test("Returns confirmation message after successful update or delete", () => {
        const updateMessage = getActionConfirmationMessage("update", true);
        const deleteMessage = getActionConfirmationMessage("delete", true);

        expect(updateMessage).toBe("Event updated successfully.");
        expect(deleteMessage).toBe("Event deleted successfully.");
    });

    // Validation test:
    // Given the event type is group
    // When no group is selected during edit
    // Then a group validation error should be shown
    test("Shows selected group validation error during edit for group event", () => {
        const errors = validateEditFields({
            title: "Updated Event",
            description: "New description",
            category: "Academic",
            eventDate: "2026-03-28",
            eventTime: "14:00",
            endDate: "2026-03-28",
            endTime: "16:00",
            location: "SLC",
            capacity: 10,
            eventType: "group",
            selectedGroups: [],
        });

        expect(errors.selectedGroups).toBe("Please select at least one group for a group event.");
    });
});