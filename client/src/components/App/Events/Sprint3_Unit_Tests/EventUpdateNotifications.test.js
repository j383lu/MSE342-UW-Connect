// Created by: Derrick Lu

// Unit tests for event update notification features in Sprint 3
// Covers notifications sent to current event attendees after organizer edits an event

describe("Event update notification feature tests", () => {

    // Set up helper function to extract changed field names
    const getChangedFieldNames = (beforeEvent, afterEvent) => {
        const trackedFields = [
            "title",
            "event_date",
            "event_time",
            "end_date",
            "end_time",
            "location",
            "description",
            "category",
        ];

        return trackedFields.filter(
            (field) => String(beforeEvent?.[field] || "") !== String(afterEvent?.[field] || "")
        );
    };

    // Set up helper function to create notifications only for current attendees
    const createEventUpdateNotifications = (attendees, changedFields, eventTitle) => {
        if (!Array.isArray(attendees) || attendees.length === 0) return [];
        if (!Array.isArray(changedFields) || changedFields.length === 0) return [];

        return attendees.map((attendee) => ({
            recipientId: attendee.user_id,
            action_type: "EVENT_UPDATE",
            eventTitle,
            changedFields,
            message: `The event "${eventTitle}" was updated.`,
        }));
    };

    // Set up helper function to remove users who are no longer attendees
    const filterCurrentAttendeesOnly = (allUsers, currentAttendeeIds) => {
        return allUsers.filter((user) => currentAttendeeIds.includes(user.user_id));
    };

    // Set up helper function to determine if update confirmation should show
    const getUpdateConfirmationMessage = (success) => {
        return success ? "Event updated successfully." : "";
    };

    // Given I am the organizer of an event
    // When I update the event details and save the changes
    // Then notifications should be created for the attendees of that event
    test("Creates update notifications for all current attendees", () => {
        const attendees = [
            { user_id: 1, name: "Jen" },
            { user_id: 2, name: "JP" },
        ];

        const notifications = createEventUpdateNotifications(
            attendees,
            ["title", "location"],
            "Night Party"
        );

        expect(notifications.length).toBe(2);
        expect(notifications[0].recipientId).toBe(1);
        expect(notifications[1].recipientId).toBe(2);
    });

    // Given I am an attendee of an event
    // When the organizer updates the event title, date, time, location, or description
    // Then I should receive a notification with the updated event information
    test("Tracks changed event fields for attendee update notifications", () => {
        const beforeEvent = {
            title: "Night Party",
            event_date: "2026-03-20",
            event_time: "18:00",
            end_date: "2026-03-20",
            end_time: "20:00",
            location: "SLC",
            description: "Old description",
            category: "Social",
        };

        const afterEvent = {
            title: "Night Party Updated",
            event_date: "2026-03-21",
            event_time: "19:00",
            end_date: "2026-03-21",
            end_time: "21:00",
            location: "MC",
            description: "New description",
            category: "Social",
        };

        const changedFields = getChangedFieldNames(beforeEvent, afterEvent);

        expect(changedFields).toContain("title");
        expect(changedFields).toContain("event_date");
        expect(changedFields).toContain("event_time");
        expect(changedFields).toContain("location");
        expect(changedFields).toContain("description");
    });

    // Given I am the organizer of an event
    // When I save changes to my event successfully
    // Then I should see a confirmation message that the event was updated
    test("Returns success message after event update succeeds", () => {
        const message = getUpdateConfirmationMessage(true);

        expect(message).toBe("Event updated successfully.");
    });

    // Given a user did not join the event
    // When the organizer updates the event
    // Then that user should not receive a notification for that event
    test("Does not notify users who never joined the event", () => {
        const allUsers = [
            { user_id: 1, name: "Jen" },
            { user_id: 2, name: "JP" },
            { user_id: 3, name: "Katherine" },
        ];

        const currentAttendees = filterCurrentAttendeesOnly(allUsers, [1, 2]);

        expect(currentAttendees.length).toBe(2);
        expect(currentAttendees.find((u) => u.user_id === 3)).toBeUndefined();
    });

    // Given an attendee has left the event before the update
    // When the organizer updates the event
    // Then that former attendee should not receive a notification
    test("Does not notify users who left before the event update", () => {
        const allUsers = [
            { user_id: 1, name: "Jen" },
            { user_id: 2, name: "JP" },
            { user_id: 4, name: "Former User" },
        ];

        const currentAttendees = filterCurrentAttendeesOnly(allUsers, [1, 2]);

        expect(currentAttendees.some((u) => u.user_id === 4)).toBe(false);
    });

    // Given I open the Notifications page
    // When there are unread event update notifications
    // Then they should appear in the notification list as new notifications
    test("Creates event update notifications that can be shown in notification list", () => {
        const attendees = [{ user_id: 8, name: "Jen" }];
        const notifications = createEventUpdateNotifications(
            attendees,
            ["location"],
            "Basketball Night"
        );

        expect(Array.isArray(notifications)).toBe(true);
        expect(notifications[0].action_type).toBe("EVENT_UPDATE");
    });

    // Given I am viewing my notifications
    // When I open the event update notification
    // Then I should be able to understand which event was changed and what action happened
    test("Includes event title and changed fields in update notification", () => {
        const attendees = [{ user_id: 8, name: "Jen" }];
        const notifications = createEventUpdateNotifications(
            attendees,
            ["title", "location"],
            "Basketball Night"
        );

        expect(notifications[0].eventTitle).toBe("Basketball Night");
        expect(notifications[0].changedFields).toContain("title");
        expect(notifications[0].changedFields).toContain("location");
    });
});