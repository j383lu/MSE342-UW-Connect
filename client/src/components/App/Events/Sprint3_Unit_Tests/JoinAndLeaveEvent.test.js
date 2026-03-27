// Created by: Derrick Lu

// Unit tests for join and leave event features in Sprint 3
// Covers join event logic, leave event logic, attendee count updates,
// button state changes, permission checks, and organizer notifications

describe("Join and leave event feature tests", () => {

    // Helper function to add a user into the attendee list
    const addAttendeeToList = (attendees, newAttendee) => {
        if (!Array.isArray(attendees) || !newAttendee) return attendees || [];

        const alreadyJoined = attendees.some(
            (attendee) => Number(attendee.user_id) === Number(newAttendee.user_id)
        );

        if (alreadyJoined) return attendees;

        return [...attendees, newAttendee];
    };

    // Helper function to remove a user from the attendee list
    const removeAttendeeFromList = (attendees, userIdToRemove) => {
        if (!Array.isArray(attendees)) return [];
        return attendees.filter(
            (attendee) => Number(attendee.user_id) !== Number(userIdToRemove)
        );
    };

    // Helper function to increase attendee count after joining
    const getUpdatedAttendeeCountAfterJoin = (currentCount) => {
        return Number(currentCount || 0) + 1;
    };

    // Helper function to decrease attendee count after leaving
    const getUpdatedAttendeeCountAfterLeave = (currentCount) => {
        const nextCount = Number(currentCount || 0) - 1;
        return nextCount < 0 ? 0 : nextCount;
    };

    // Helper function to update event state after joining
    const getJoinEventStateUpdate = (event) => {
        return {
            ...event,
            has_joined: 1,
            current_count: getUpdatedAttendeeCountAfterJoin(event.current_count),
        };
    };

    // Helper function to update event state after leaving
    const getLeaveEventStateUpdate = (event) => {
        return {
            ...event,
            has_joined: 0,
            current_count: getUpdatedAttendeeCountAfterLeave(event.current_count),
        };
    };

    // Helper function to determine which button label should be shown
    const getJoinLeaveButtonLabel = (hasJoined) => {
        return Number(hasJoined) === 1 ? "Leave Event" : "Join Event";
    };

    // Helper function to check if a user can join an event
    const canJoinEvent = (isLoggedIn, hasJoined, currentCount, capacity, isPastEvent = false) => {
        if (!isLoggedIn) return false;
        if (Number(hasJoined) === 1) return false;
        if (isPastEvent) return false;
        if (Number(currentCount) >= Number(capacity)) return false;
        return true;
    };

    // Helper function to check if a user can leave an event
    const canLeaveEvent = (isLoggedIn, hasJoined) => {
        if (!isLoggedIn) return false;
        return Number(hasJoined) === 1;
    };

    // Helper function to create organizer notification for join or leave action
    const createAttendanceNotification = (actionType, organizerId, actorName, eventTitle) => {
        if (!organizerId || !actorName || !eventTitle) return null;

        const normalizedAction = String(actionType || "").trim().toUpperCase();

        if (normalizedAction === "JOIN") {
            return {
                recipientId: organizerId,
                action_type: "JOIN",
                message: `${actorName} joined your event "${eventTitle}".`,
            };
        }

        if (normalizedAction === "LEAVE") {
            return {
                recipientId: organizerId,
                action_type: "LEAVE",
                message: `${actorName} left your event "${eventTitle}".`,
            };
        }

        return null;
    };

    // Helper function to return success message after joining
    const getJoinSuccessMessage = (eventTitle) => {
        return `You have successfully joined the "${eventTitle}" event.`;
    };

    // Helper function to return success message after leaving
    const getLeaveSuccessMessage = (eventTitle) => {
        return `You have successfully left the "${eventTitle}" event.`;
    };


    // Join event tests

    // Given I am logged in and have not joined an event
    // When I click the Join Event button
    // Then I should be added to the attendee list
    test("Adds current user to attendee list after joining", () => {
        const attendees = [
            { user_id: 1, name: "Derrick" },
            { user_id: 2, name: "Jen" },
        ];

        const updatedAttendees = addAttendeeToList(attendees, {
            user_id: 3,
            name: "JP",
        });

        expect(updatedAttendees.length).toBe(3);
        expect(updatedAttendees.find((attendee) => attendee.user_id === 3)).toEqual({
            user_id: 3,
            name: "JP",
        });
    });

    // Given I successfully join an event
    // When the action is completed
    // Then the attendee count should increase by 1
    test("Increases attendee count by 1 after joining", () => {
        const updatedCount = getUpdatedAttendeeCountAfterJoin(4);

        expect(updatedCount).toBe(5);
    });

    // Given I successfully join an event
    // When the page updates
    // Then the button should change from Join Event to Leave Event
    test("Changes button from Join Event to Leave Event after joining", () => {
        const updatedEvent = getJoinEventStateUpdate({
            id: 10,
            title: "Movie Night",
            current_count: 2,
            has_joined: 0,
        });

        const buttonLabel = getJoinLeaveButtonLabel(updatedEvent.has_joined);

        expect(updatedEvent.has_joined).toBe(1);
        expect(updatedEvent.current_count).toBe(3);
        expect(buttonLabel).toBe("Leave Event");
    });

    // Given I join an event
    // When the organizer checks notifications
    // Then they should receive a notification that I joined the event
    test("Creates join notification for the organizer", () => {
        const notification = createAttendanceNotification(
            "JOIN",
            99,
            "Jen",
            "Movie Night"
        );

        expect(notification.recipientId).toBe(99);
        expect(notification.action_type).toBe("JOIN");
        expect(notification.message).toBe('Jen joined your event "Movie Night".');
    });

    // Given I am not logged in
    // When I try to join an event
    // Then I should not be allowed to join
    test("Does not allow join when user is not logged in", () => {
        const allowed = canJoinEvent(false, 0, 2, 10, false);

        expect(allowed).toBe(false);
    });

    // Given I have already joined an event
    // When I try to join again
    // Then I should not be allowed to join again
    test("Does not allow join when user has already joined the event", () => {
        const allowed = canJoinEvent(true, 1, 2, 10, false);

        expect(allowed).toBe(false);
    });

    // Given an event is already full
    // When I try to join the event
    // Then I should not be allowed to join
    test("Does not allow join when event is full", () => {
        const allowed = canJoinEvent(true, 0, 10, 10, false);

        expect(allowed).toBe(false);
    });

    // Given I successfully join an event
    // When the action finishes
    // Then I should see a success message confirming I joined the event
    test("Returns join success message after joining event", () => {
        const message = getJoinSuccessMessage("Movie Night");

        expect(message).toBe('You have successfully joined the "Movie Night" event.');
    });


    // Leave event tests

    // Given I am logged in and have joined an event
    // When I click the Leave Event button
    // Then I should be removed from the attendee list
    test("Removes current user from attendee list after leaving", () => {
        const attendees = [
            { user_id: 1, name: "Derrick" },
            { user_id: 2, name: "Jen" },
            { user_id: 3, name: "JP" },
        ];

        const updatedAttendees = removeAttendeeFromList(attendees, 2);

        expect(updatedAttendees.length).toBe(2);
        expect(updatedAttendees.find((attendee) => attendee.user_id === 2)).toBeUndefined();
    });

    // Given I successfully leave an event
    // When the action is completed
    // Then the attendee count should decrease by 1
    test("Decreases attendee count by 1 after leaving", () => {
        const updatedCount = getUpdatedAttendeeCountAfterLeave(5);

        expect(updatedCount).toBe(4);
    });

    // Given I successfully leave an event
    // When the page updates
    // Then the button should change from Leave Event to Join Event
    test("Changes button from Leave Event to Join Event after leaving", () => {
        const updatedEvent = getLeaveEventStateUpdate({
            id: 10,
            title: "Movie Night",
            current_count: 3,
            has_joined: 1,
        });

        const buttonLabel = getJoinLeaveButtonLabel(updatedEvent.has_joined);

        expect(updatedEvent.has_joined).toBe(0);
        expect(updatedEvent.current_count).toBe(2);
        expect(buttonLabel).toBe("Join Event");
    });

    // Given I leave an event
    // When the organizer checks notifications
    // Then they should receive a notification that I left the event
    test("Creates leave notification for the organizer", () => {
        const notification = createAttendanceNotification(
            "LEAVE",
            99,
            "Jen",
            "Movie Night"
        );

        expect(notification.recipientId).toBe(99);
        expect(notification.action_type).toBe("LEAVE");
        expect(notification.message).toBe('Jen left your event "Movie Night".');
    });

    // Given I am not logged in
    // When I try to leave an event
    // Then I should not be allowed to leave
    test("Does not allow leave when user is not logged in", () => {
        const allowed = canLeaveEvent(false, 1);

        expect(allowed).toBe(false);
    });

    // Given I have not joined an event
    // When I try to leave the event
    // Then I should not be allowed to leave
    test("Does not allow leave when user has not joined the event", () => {
        const allowed = canLeaveEvent(true, 0);

        expect(allowed).toBe(false);
    });

    // Given I successfully leave an event
    // When the action finishes
    // Then I should see a success message confirming I left the event
    test("Returns leave success message after leaving event", () => {
        const message = getLeaveSuccessMessage("Movie Night");

        expect(message).toBe('You have successfully left the "Movie Night" event.');
    });

});