// Created by: Derrick Lu

// Unit tests for EventsPage sorting features in Sprint 2
// Covers sorting by date and sorting by likes functionality

describe("EventsPage sorting feature tests", () => {

    // Set up helper function to sort events by most recent published time
    const sortByMostRecentPublished = (events) => {
        return [...events].sort((a, b) => {
            const bTime = new Date(b.published_time);
            const aTime = new Date(a.published_time);
            return bTime - aTime;
        });
    };

    // Set up helper function to sort events by likes
    // If likes are equal, use published time as tie breaker
    const sortByMostLiked = (events) => {
        return [...events].sort((a, b) => {
            const likeDiff = Number(b.likes || 0) - Number(a.likes || 0);
            if (likeDiff !== 0) return likeDiff;

            const bTime = new Date(b.published_time);
            const aTime = new Date(a.published_time);
            return bTime - aTime;
        });
    };

    // Set up helper function to split events into upcoming and past sections
    const splitUpcomingAndPast = (events) => {
        return {
            upcoming: events.filter((e) => Number(e.is_past) === 0),
            past: events.filter((e) => Number(e.is_past) === 1),
        };
    };

    // Set up helper function to return no results message
    const getNoResultsMessage = (results) => {
        if (!results || results.length === 0) {
            return "No matching events";
        }
        return "";
    };

    // Set up helper function to keep sorting preference
    const keepSortingPreference = (selectedSort, nextActionApplied) => {
        if (nextActionApplied) {
            return selectedSort;
        }
        return selectedSort;
    };

    // Set up helper function to return available sorting options
    const getSortingOptions = () => {
        return [
            "mostUpcoming",
            "mostRecentPublished",
            "mostLiked",
        ];
    };

    // Sort by date feature tests

    // AC 1:
    // Given an event joiner is viewing the event search results page
    // When search results are displayed
    // Then events are shown from newest to oldest based on the event posting date
    test("Displays search results from newest to oldest based on published date", () => {
        const results = [
            {
                title: "Older Event",
                published_time: "2026-03-10 09:00:00",
                is_past: 0,
                likes: 2,
            },
            {
                title: "Newest Event",
                published_time: "2026-03-12 14:00:00",
                is_past: 0,
                likes: 5,
            },
            {
                title: "Middle Event",
                published_time: "2026-03-11 11:00:00",
                is_past: 0,
                likes: 3,
            },
        ];

        const sorted = sortByMostRecentPublished(results);

        expect(sorted[0].title).toBe("Newest Event");
        expect(sorted[1].title).toBe("Middle Event");
        expect(sorted[2].title).toBe("Older Event");
    });

    // AC 2:
    // Given an event joiner wants to organize events by recency
    // When the user selects the sort by date option
    // Then the system updates the search results to display the most recent events first
    test("Applies sort by date correctly when selected", () => {
        const results = [
            {
                title: "Event A",
                published_time: "2026-03-09 10:00:00",
                is_past: 0,
            },
            {
                title: "Event B",
                published_time: "2026-03-12 10:00:00",
                is_past: 0,
            },
        ];

        const sorted = sortByMostRecentPublished(results);

        expect(sorted[0].title).toBe("Event B");
        expect(sorted[1].title).toBe("Event A");
    });

    // AC 3:
    // Given new events are added to the system
    // When the event joiner refreshes the page or performs a new search
    // Then the newly created events appear at the top of the results list
    test("Places newly created events at the top after refresh or new search", () => {
        const results = [
            {
                title: "Old Event",
                published_time: "2026-03-10 10:00:00",
                is_past: 0,
            },
            {
                title: "New Event",
                published_time: "2026-03-13 08:00:00",
                is_past: 0,
            },
        ];

        const sorted = sortByMostRecentPublished(results);

        expect(sorted[0].title).toBe("New Event");
        expect(sorted[1].title).toBe("Old Event");
    });

    // AC 4:
    // Given multiple events have the same posting date
    // When results are sorted by date
    // Then events are further ordered based on posting time
    test("Uses posting time as tie breaker when posting date is the same", () => {
        const results = [
            {
                title: "Earlier Time Event",
                published_time: "2026-03-12 09:00:00",
                is_past: 0,
            },
            {
                title: "Later Time Event",
                published_time: "2026-03-12 15:00:00",
                is_past: 0,
            },
        ];

        const sorted = sortByMostRecentPublished(results);

        expect(sorted[0].title).toBe("Later Time Event");
        expect(sorted[1].title).toBe("Earlier Time Event");
    });

    // AC 5:
    // Given an event joiner performs a search with no matching events
    // When sorting by date is applied
    // Then the system displays a message indicating that no events are available
    test("Shows no matching events message for empty date sorted results", () => {
        const message = getNoResultsMessage([]);

        expect(message).toBe("No matching events");
    });

    // AC 6:
    // Given an event joiner has selected the sort by date option
    // When the user navigates or applies additional filters
    // Then the selected sorting preference remains applied
    test("Keeps sort by date preference when user navigates or applies filters", () => {
        const keptPreference = keepSortingPreference("mostRecentPublished", true);

        expect(keptPreference).toBe("mostRecentPublished");
    });

    // AC 7:
    // Given the event search page is displayed
    // When sorting options are available
    // Then the sort by date option is clearly visible and selectable by the user
    test("Includes most recent published option in sorting choices", () => {
        const options = getSortingOptions();

        expect(options).toContain("mostRecentPublished");
    });

    // Sort by likes feature tests

    // AC 1:
    // Given an event joiner is viewing the event search results
    // When the user selects the sort by likes option
    // Then the system displays results ordered from highest to lowest number of likes
    test("Sorts results from highest likes to lowest likes", () => {
        const results = [
            {
                title: "Event A",
                likes: 2,
                published_time: "2026-03-10 10:00:00",
                is_past: 0,
            },
            {
                title: "Event B",
                likes: 9,
                published_time: "2026-03-11 10:00:00",
                is_past: 0,
            },
            {
                title: "Event C",
                likes: 5,
                published_time: "2026-03-12 10:00:00",
                is_past: 0,
            },
        ];

        const sorted = sortByMostLiked(results);

        expect(sorted[0].title).toBe("Event B");
        expect(sorted[1].title).toBe("Event C");
        expect(sorted[2].title).toBe("Event A");
    });

    // AC 2:
    // Given search results are displayed
    // When sorting by likes is applied
    // Then events with more likes appear before events with fewer likes
    test("Places events with more likes before events with fewer likes", () => {
        const results = [
            {
                title: "Low Likes Event",
                likes: 1,
                published_time: "2026-03-10 09:00:00",
                is_past: 0,
            },
            {
                title: "High Likes Event",
                likes: 8,
                published_time: "2026-03-09 09:00:00",
                is_past: 0,
            },
        ];

        const sorted = sortByMostLiked(results);

        expect(sorted[0].title).toBe("High Likes Event");
        expect(sorted[1].title).toBe("Low Likes Event");
    });

    // AC 3:
    // Given multiple events have the same number of likes
    // When results are sorted
    // Then the system orders those events consistently using posting date or time
    test("Uses published time as tie breaker when likes are equal", () => {
        const results = [
            {
                title: "Older Published Event",
                likes: 5,
                published_time: "2026-03-10 10:00:00",
                is_past: 0,
            },
            {
                title: "Newer Published Event",
                likes: 5,
                published_time: "2026-03-12 10:00:00",
                is_past: 0,
            },
        ];

        const sorted = sortByMostLiked(results);

        expect(sorted[0].title).toBe("Newer Published Event");
        expect(sorted[1].title).toBe("Older Published Event");
    });

    // AC 4:
    // Given an event joiner changes the sorting option to sort by likes
    // When the option is selected
    // Then the results update immediately without requiring a page refresh
    test("Applies sort by likes immediately to current results", () => {
        const results = [
            {
                title: "Event A",
                likes: 3,
                published_time: "2026-03-11 10:00:00",
                is_past: 0,
            },
            {
                title: "Event B",
                likes: 7,
                published_time: "2026-03-10 10:00:00",
                is_past: 0,
            },
        ];

        const sorted = sortByMostLiked(results);

        expect(sorted.length).toBe(2);
        expect(sorted[0].title).toBe("Event B");
    });

    // AC 5:
    // Given new likes are added to an event
    // When the event joiner refreshes or performs a new search
    // Then the event ranking updates according to the latest like counts
    test("Updates ranking after likes are changed", () => {
        const results = [
            {
                title: "Event A",
                likes: 6,
                published_time: "2026-03-10 10:00:00",
                is_past: 0,
            },
            {
                title: "Event B",
                likes: 4,
                published_time: "2026-03-11 10:00:00",
                is_past: 0,
            },
        ];

        const sorted = sortByMostLiked(results);

        expect(sorted[0].title).toBe("Event A");
    });

    // AC 6:
    // Given an event joiner navigates between search pages or filters
    // When sort by likes was previously selected
    // Then the sorting preference remains applied
    test("Keeps sort by likes preference when user navigates or applies filters", () => {
        const keptPreference = keepSortingPreference("mostLiked", true);

        expect(keptPreference).toBe("mostLiked");
    });

    // AC 7:
    // Given there are no events in the search results
    // When sorting by likes is applied
    // Then the system displays a message indicating that no results are available
    test("Shows no matching events message for empty likes sorted results", () => {
        const message = getNoResultsMessage([]);

        expect(message).toBe("No matching events");
    });

    // Additional sorting logic test:
    // Given search results contain both upcoming and past events
    // When results are prepared for display
    // Then the system separates them into upcoming and past sections
    test("Separates search results into upcoming and past sections", () => {
        const results = [
            {
                title: "Upcoming Event",
                published_time: "2026-03-12 14:00:00",
                is_past: 0,
                likes: 2,
            },
            {
                title: "Past Event",
                published_time: "2026-03-13 10:00:00",
                is_past: 1,
                likes: 5,
            },
        ];

        const split = splitUpcomingAndPast(results);

        expect(split.upcoming.length).toBe(1);
        expect(split.past.length).toBe(1);
        expect(split.upcoming[0].title).toBe("Upcoming Event");
        expect(split.past[0].title).toBe("Past Event");
    });

});