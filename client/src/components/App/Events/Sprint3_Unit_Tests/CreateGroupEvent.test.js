// Created by: Derrick Lu

// Unit tests for create event with group or individual option in Sprint 3
// Covers event type selection, group selection, permission, and validation logic

describe("Create group or individual event feature tests", () => {

    // Set up helper function to show available event type options
    const getEventTypeOptions = () => {
        return ["public", "group"];
    };

    // Set up helper function to determine if group selection should show
    const shouldShowGroupSelection = (eventType) => {
        return String(eventType || "").toLowerCase() === "group";
    };

    // Set up helper function to validate required create event fields
    const validateCreateEventFields = (formData) => {
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

        return errors;
    };

    // Set up helper function to check if user has groups
    const getGroupMessage = (joinedGroups) => {
        if (!Array.isArray(joinedGroups) || joinedGroups.length === 0) {
            return "You are not currently in any groups.";
        }
        return "";
    };

    // Set up helper function to decide event visibility
    const getVisibleUserScope = (eventType, selectedGroups) => {
        if (eventType === "public") {
            return "all_users";
        }

        if (eventType === "group" && Array.isArray(selectedGroups) && selectedGroups.length > 0) {
            return "selected_groups_only";
        }

        return "invalid";
    };

    // Set up helper function to decide whether a user can view a group event
    const canUserViewGroupEvent = (userGroupIds, eventGroupIds) => {
        return eventGroupIds.some((groupId) => userGroupIds.includes(groupId));
    };

    // Set up helper function to return confirmation message
    const getCreateConfirmationMessage = (success) => {
        return success ? "Event created successfully." : "";
    };

    // Given the user is on the create event page
    // When they open the event creation form
    // Then they should see an option to choose between individual and group event
    test("Shows options to choose between individual and group event", () => {
        const options = getEventTypeOptions();

        expect(options).toContain("public");
        expect(options).toContain("group");
    });

    // Given the user selects the individual option
    // When they submit the event
    // Then the event should be visible to all users
    test("Makes individual event visible to all users", () => {
        const scope = getVisibleUserScope("public", []);

        expect(scope).toBe("all_users");
    });

    // Given the user selects the group option
    // When they proceed with event creation
    // Then they should be able to select one or more groups
    test("Shows group selection when group event option is selected", () => {
        const showGroupSelection = shouldShowGroupSelection("group");

        expect(showGroupSelection).toBe(true);
    });

    // Given the user has selected one or more groups
    // When the event is created
    // Then only users in those groups should be able to view the event
    test("Makes group event visible only to selected groups", () => {
        const scope = getVisibleUserScope("group", [{ group_id: 1 }, { group_id: 2 }]);

        expect(scope).toBe("selected_groups_only");
    });

    // Given a user is not in the selected group
    // When they try to access the event
    // Then they should not be able to view or join the event
    test("Prevents users outside selected groups from viewing group event", () => {
        const canView = canUserViewGroupEvent([5, 6], [1, 2]);

        expect(canView).toBe(false);
    });

    // Given a user is in the selected group
    // When they view the event
    // Then they should be able to join the event
    test("Allows users in selected groups to view group event", () => {
        const canView = canUserViewGroupEvent([2, 6], [1, 2]);

        expect(canView).toBe(true);
    });

    // Given the user selects the group option but does not select any group
    // When they submit the form
    // Then an error message should be displayed
    test("Shows validation error when group event is submitted without selected groups", () => {
        const errors = validateCreateEventFields({
            title: "Night Event",
            description: "Fun activity",
            category: "Social",
            eventDate: "2026-03-27",
            eventTime: "18:00",
            endDate: "2026-03-27",
            endTime: "20:00",
            location: "SLC",
            capacity: 10,
            eventType: "group",
            selectedGroups: [],
        });

        expect(errors.selectedGroups).toBe("Please select at least one group for a group event.");
    });

    // Given the event form has missing required fields
    // When the user submits the form
    // Then validation errors should be shown
    test("Shows validation errors when required fields are missing", () => {
        const errors = validateCreateEventFields({
            title: "",
            description: "",
            category: "",
            eventDate: "",
            eventTime: "",
            endDate: "",
            endTime: "",
            location: "",
            capacity: "",
            eventType: "public",
            selectedGroups: [],
        });

        expect(errors.title).toBe("Event Title is empty, please enter event title.");
        expect(errors.description).toBe("Description is empty, please enter event description.");
        expect(errors.category).toBe("Category is empty, please select a category.");
        expect(errors.eventDate).toBe("Start Date is empty, please select start date.");
        expect(errors.eventTime).toBe("Start Time is empty, please select start time.");
        expect(errors.endDate).toBe("End Date is empty, please select end date.");
        expect(errors.endTime).toBe("End Time is empty, please select end time.");
        expect(errors.location).toBe("Location is empty, please enter event location.");
        expect(errors.capacity).toBe("Max RSVP Spots is empty, please enter the maximum RSVP spots.");
    });

    // Given the event is successfully created
    // When the process completes
    // Then a confirmation message should be displayed
    test("Returns confirmation message after successful event creation", () => {
        const message = getCreateConfirmationMessage(true);

        expect(message).toBe("Event created successfully.");
    });

    // Given the user has not joined any groups
    // When the user chooses the group event option
    // Then the system should show the no groups message
    test("Shows message when user has not joined any groups", () => {
        const message = getGroupMessage([]);

        expect(message).toBe("You are not currently in any groups.");
    });

});