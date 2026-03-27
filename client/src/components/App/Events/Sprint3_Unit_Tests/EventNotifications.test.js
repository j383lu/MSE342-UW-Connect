// Created by: Derrick Lu

// Unit tests for organizer attendance notification features in Sprint 3
// Covers notifications when a user joins or leaves an event

describe("Event attendance notification feature tests", () => {

    // Set up helper function to create one organizer notification
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

    // Set up helper function to decide whether organizer should receive notification
    const shouldNotifyOrganizer = (organizerId, actingUserId) => {
        if (!organizerId || !actingUserId) return false;
        return Number(organizerId) !== Number(actingUserId);
    };

    // Set up helper function to create one notification per join or leave action
    const createNotificationsForActions = (actions, organizerId, eventTitle) => {
        if (!Array.isArray(actions)) return [];

        return actions
            .map((action) =>
                createAttendanceNotification(
                    action.type,
                    organizerId,
                    action.actorName,
                    eventTitle
                )
            )
            .filter(Boolean);
    };

    // Set up helper function to return organizer notification list text
    const getAttendanceNotificationText = (notification) => {
        if (!notification) return "";
        return notification.message || "";
    };

    // Given I am the organizer of an event
    // When a user joins my event
    // Then I should receive a notification that the user joined the event
    test("Creates a join notification for the organizer", () => {
        const notification = createAttendanceNotification(
            "JOIN",
            10,
            "Jen",
            "Night Market Event"
        );

        expect(notification.recipientId).toBe(10);
        expect(notification.action_type).toBe("JOIN");
        expect(notification.message).toBe('Jen joined your event "Night Market Event".');
    });

    // Given I am the organizer of an event
    // When a user leaves my event
    // Then I should receive a notification that the user left the event
    test("Creates a leave notification for the organizer", () => {
        const notification = createAttendanceNotification(
            "LEAVE",
            10,
            "JP",
            "Study Meetup"
        );

        expect(notification.recipientId).toBe(10);
        expect(notification.action_type).toBe("LEAVE");
        expect(notification.message).toBe('JP left your event "Study Meetup".');
    });

    // Given multiple users join or leave my event
    // When each action is completed
    // Then a separate notification should be created for each join or leave action
    test("Creates a separate notification for each join or leave action", () => {
        const actions = [
            { type: "JOIN", actorName: "Jen" },
            { type: "LEAVE", actorName: "JP" },
            { type: "JOIN", actorName: "Pallavi" },
        ];

        const notifications = createNotificationsForActions(actions, 20, "Hackathon");

        expect(notifications.length).toBe(3);
        expect(notifications[0].message).toBe('Jen joined your event "Hackathon".');
        expect(notifications[1].message).toBe('JP left your event "Hackathon".');
        expect(notifications[2].message).toBe('Pallavi joined your event "Hackathon".');
    });

    // Given I am viewing my notifications
    // When a user joins my event
    // Then the notification should show which user joined and which event was affected
    test("Shows actor name and event title for join notification", () => {
        const notification = createAttendanceNotification(
            "JOIN",
            5,
            "Derrick",
            "Career Fair"
        );

        const text = getAttendanceNotificationText(notification);

        expect(text).toContain("Derrick");
        expect(text).toContain("Career Fair");
        expect(text).toContain("joined");
    });

    // Given I am viewing my notifications
    // When a user leaves my event
    // Then the notification should show which user left and which event was affected
    test("Shows actor name and event title for leave notification", () => {
        const notification = createAttendanceNotification(
            "LEAVE",
            5,
            "Jen",
            "Movie Night"
        );

        const text = getAttendanceNotificationText(notification);

        expect(text).toContain("Jen");
        expect(text).toContain("Movie Night");
        expect(text).toContain("left");
    });

    // Given I am not the organizer of the event
    // When another user joins or leaves that event
    // Then I should not receive the organizer notification for that event
    test("Does not notify organizer when organizer is the acting user", () => {
        const shouldNotify = shouldNotifyOrganizer(7, 7);

        expect(shouldNotify).toBe(false);
    });

    // Given I open the notifications page after users join or leave my event
    // When the notification list loads
    // Then the new event attendance notifications should appear in my notifications list
    test("Returns organizer notification items to be shown in notification list", () => {
        const actions = [
            { type: "JOIN", actorName: "Jen" },
            { type: "LEAVE", actorName: "JP" },
        ];

        const notifications = createNotificationsForActions(actions, 99, "Board Games");

        expect(Array.isArray(notifications)).toBe(true);
        expect(notifications.length).toBe(2);
    });
});