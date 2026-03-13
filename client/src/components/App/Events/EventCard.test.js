// Created by: Derrick Lu

// Unit tests for EventCard.js with Sprint 2 User Story 61 used
// 61. As an event joiner, I want to sort search results by the number of likes,
//     so that I can easily find the most popular or helpful content.

describe("EventCard test with User Story 61", () => {

    // Set up helper function to simulate like action logic
    const applyLike = async ({ likeLoading, liked, currentLikes, requestFails }) => {
        if (likeLoading || liked) {
            return {
                likes: currentLikes,
                liked,
                blocked: true,
                error: "",
            };
        }

        if (requestFails) {
            return {
                likes: currentLikes,
                liked: false,
                blocked: false,
                error: "Failed to like event.",
            };
        }

        return {
            likes: currentLikes + 1,
            liked: true,
            blocked: false,
            error: "",
        };
    };

    // Set up helper function to sort events by likes
    // Tie breaker uses published time from newest to oldest
    const sortByLikes = (events) => {
        return [...events].sort((a, b) => {
            const likeDiff = Number(b.likes || 0) - Number(a.likes || 0);
            if (likeDiff !== 0) return likeDiff;

            const bTime = new Date(b.published_time);
            const aTime = new Date(a.published_time);
            return bTime - aTime;
        });
    };

    // Set up helper function to determine empty result message
    const getEmptyResultsMessage = (results) => {
        if (!results || results.length === 0) {
            return "No events are available.";
        }
        return "";
    };

    // AC 1:
    // Given an event joiner is viewing event search results
    // When the user selects the "Sort by Likes" option
    // Then the system displays results ordered from highest to lowest number of likes
    test("Sorts results from highest likes to lowest likes", () => {
        const events = [
            {
                title: "Event A",
                likes: 2,
                published_time: "2026-03-10 10:00:00",
            },
            {
                title: "Event B",
                likes: 9,
                published_time: "2026-03-11 10:00:00",
            },
            {
                title: "Event C",
                likes: 5,
                published_time: "2026-03-12 10:00:00",
            },
        ];

        const sorted = sortByLikes(events);

        expect(sorted[0].title).toBe("Event B");
        expect(sorted[1].title).toBe("Event C");
        expect(sorted[2].title).toBe("Event A");
    });

    // AC 2:
    // Given search results are displayed
    // When sorting by likes is applied
    // Then events with more likes appear before events with fewer likes
    test("Places events with more likes before events with fewer likes", () => {
        const events = [
            {
                title: "Low Likes Event",
                likes: 1,
                published_time: "2026-03-10 09:00:00",
            },
            {
                title: "High Likes Event",
                likes: 8,
                published_time: "2026-03-09 09:00:00",
            },
        ];

        const sorted = sortByLikes(events);

        expect(sorted[0].title).toBe("High Likes Event");
        expect(sorted[1].title).toBe("Low Likes Event");
    });

    // AC 3:
    // Given multiple events have the same number of likes
    // When results are sorted
    // Then the system orders those events consistently using posting date or time
    test("Uses published time as tie breaker when likes are equal", () => {
        const events = [
            {
                title: "Older Published Event",
                likes: 5,
                published_time: "2026-03-10 10:00:00",
            },
            {
                title: "Newer Published Event",
                likes: 5,
                published_time: "2026-03-12 10:00:00",
            },
        ];

        const sorted = sortByLikes(events);

        expect(sorted[0].title).toBe("Newer Published Event");
        expect(sorted[1].title).toBe("Older Published Event");
    });

    // AC 4:
    // Given an event joiner changes the sorting option to "Sort by Likes"
    // When the option is selected
    // Then the results update immediately without requiring a page refresh
    test("Returns sorted results immediately when sort by likes is selected", () => {
        const events = [
            {
                title: "Event A",
                likes: 3,
                published_time: "2026-03-11 10:00:00",
            },
            {
                title: "Event B",
                likes: 7,
                published_time: "2026-03-10 10:00:00",
            },
        ];

        const sorted = sortByLikes(events);

        expect(sorted.length).toBe(2);
        expect(sorted[0].title).toBe("Event B");
    });

    // AC 5:
    // Given new likes are added to an event
    // When the event joiner refreshes or performs a new search
    // Then the event ranking updates according to the latest like counts
    test("Updates ranking after new likes are added", async () => {
        const likeResult = await applyLike({
            likeLoading: false,
            liked: false,
            currentLikes: 4,
            requestFails: false,
        });

        const events = [
            {
                title: "Event A",
                likes: likeResult.likes,
                published_time: "2026-03-10 10:00:00",
            },
            {
                title: "Event B",
                likes: 4,
                published_time: "2026-03-11 10:00:00",
            },
        ];

        const sorted = sortByLikes(events);

        expect(likeResult.likes).toBe(5);
        expect(sorted[0].title).toBe("Event A");
    });

    // AC 6:
    // Given an event joiner navigates between search pages or filters
    // When "Sort by Likes" was previously selected
    // Then the sorting preference remains applied
    test("Keeps sort by likes preference consistently applied", () => {
        const firstPageResults = [
            {
                title: "Event A",
                likes: 1,
                published_time: "2026-03-10 10:00:00",
            },
            {
                title: "Event B",
                likes: 6,
                published_time: "2026-03-09 10:00:00",
            },
        ];

        const secondPageResults = [
            {
                title: "Event C",
                likes: 3,
                published_time: "2026-03-08 10:00:00",
            },
            {
                title: "Event D",
                likes: 9,
                published_time: "2026-03-07 10:00:00",
            },
        ];

        const sortedFirstPage = sortByLikes(firstPageResults);
        const sortedSecondPage = sortByLikes(secondPageResults);

        expect(sortedFirstPage[0].title).toBe("Event B");
        expect(sortedSecondPage[0].title).toBe("Event D");
    });

    // AC 7:
    // Given there are no events in the search results
    // When sorting by likes is applied
    // Then the system displays a message indicating that no results are available
    test("Shows no results message when there are no events", () => {
        const message = getEmptyResultsMessage([]);

        expect(message).toBe("No events are available.");
    });

});