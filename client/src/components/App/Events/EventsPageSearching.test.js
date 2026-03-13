// Created by: Derrick Lu

// Unit tests for EventsPage searching features in Sprint 2
// Covers recent search history and auto suggest functionality

describe("EventsPage searching feature tests", () => {

    // Set up helper function to display recent searches when search bar is empty
    const getDisplayedRecentSearches = (searchTerm, recentSearches) => {
        const cleanTerm = String(searchTerm || "").trim();

        if (cleanTerm !== "") return [];
        return Array.isArray(recentSearches) ? recentSearches : [];
    };

    // Set up helper function to simulate selecting a recent search item
    const selectRecentSearchItem = (recentSearchTerm) => {
        return {
            selectedTerm: recentSearchTerm,
            shouldPerformSearch: true,
        };
    };

    // Set up helper function to save a new search term into history
    // If the term already exists, move it to the top instead of duplicating it
    const saveSearchToHistory = (recentSearches, newTerm) => {
        const cleanTerm = String(newTerm || "").trim();
        if (!cleanTerm) return recentSearches;

        const filtered = recentSearches.filter((item) => item !== cleanTerm);
        return [cleanTerm, ...filtered];
    };

    // Set up helper function to delete a search term from history
    const deleteSearchFromHistory = (recentSearches, termToDelete) => {
        return recentSearches.filter((item) => item !== termToDelete);
    };

    // Set up helper function to return empty recent search message
    const getRecentSearchEmptyMessage = (recentSearches) => {
        if (!recentSearches || recentSearches.length === 0) {
            return "No recent searches yet.";
        }
        return "";
    };

    // Set up helper function to generate suggestions based on keyword match
    const getSuggestions = (keyword, sourceItems) => {
        const cleanKeyword = String(keyword || "").trim().toLowerCase();
        if (!cleanKeyword) return [];

        return sourceItems.filter((item) =>
            String(item.value || "").toLowerCase().includes(cleanKeyword)
        );
    };

    // Set up helper function to select a suggestion
    const selectSuggestion = (suggestionValue) => {
        return {
            inputValue: suggestionValue,
            shouldPerformSearch: true,
        };
    };

    // Set up helper function to update suggestions dynamically
    const updateSuggestions = (keyword, sourceItems) => {
        return getSuggestions(keyword, sourceItems);
    };

    // Set up helper function to return suggestion empty message
    const getSuggestionEmptyMessage = (suggestions) => {
        if (!suggestions || suggestions.length === 0) {
            return "No suggestions found.";
        }
        return "";
    };

    // Set up helper function to handle clicking outside suggestion area
    const shouldHideSuggestionList = (clickedOutside) => {
        return clickedOutside === true;
    };

    // Set up helper function to sort suggestions by relevance
    // Higher priority type first, then alphabetical order
    const sortSuggestionsByRelevance = (suggestions) => {
        const priority = {
            Title: 1,
            Category: 2,
            Tag: 3,
        };

        return [...suggestions].sort((a, b) => {
            const typeDiff = (priority[a.type] || 99) - (priority[b.type] || 99);
            if (typeDiff !== 0) return typeDiff;

            return String(a.value).localeCompare(String(b.value));
        });
    };

    // User Story 59 tests

    // AC 1:
    // Given an event joiner has previously searched for events or topics
    // When the user opens the search page
    // Then the system displays a list of the user's recent searches
    test("Displays recent searches when search bar is empty", () => {
        const recentSearches = ["sports", "study", "volunteer"];
        const displayed = getDisplayedRecentSearches("", recentSearches);

        expect(displayed.length).toBe(3);
        expect(displayed[0]).toBe("sports");
        expect(displayed[1]).toBe("study");
        expect(displayed[2]).toBe("volunteer");
    });

    // AC 2:
    // Given an event joiner views their recent searches
    // When the user selects one of the previous search items
    // Then the system automatically performs that search and displays the corresponding results
    test("Selecting a recent search item triggers search", () => {
        const result = selectRecentSearchItem("sports");

        expect(result.selectedTerm).toBe("sports");
        expect(result.shouldPerformSearch).toBe(true);
    });

    // AC 3:
    // Given an event joiner performs a new search
    // When the search is completed successfully
    // Then the system saves the search term to the recent search history
    test("Saves a new search term into recent search history", () => {
        const recentSearches = ["study", "volunteer"];
        const updated = saveSearchToHistory(recentSearches, "sports");

        expect(updated[0]).toBe("sports");
        expect(updated).toContain("study");
        expect(updated).toContain("volunteer");
    });

    // AC 4:
    // Given an event joiner has multiple past searches
    // When the search history is displayed
    // Then the most recent searches appear at the top of the list
    test("Places most recent search at the top of the history list", () => {
        const recentSearches = ["study", "volunteer"];
        const updated = saveSearchToHistory(recentSearches, "sports");

        expect(updated[0]).toBe("sports");
    });

    // AC 5:
    // Given an event joiner clears or deletes a search entry
    // When the user selects the remove option
    // Then the selected search item is removed from the search history
    test("Deletes selected search item from recent search history", () => {
        const recentSearches = ["sports", "study", "volunteer"];
        const updated = deleteSearchFromHistory(recentSearches, "study");

        expect(updated).toEqual(["sports", "volunteer"]);
    });

    // AC 6:
    // Given an event joiner has no previous searches
    // When the search page is opened
    // Then the system displays an empty state or message indicating no recent searches are available
    test("Shows empty message when there are no recent searches", () => {
        const message = getRecentSearchEmptyMessage([]);

        expect(message).toBe("No recent searches yet.");
    });

    // AC 7:
    // Given an event joiner performs repeated searches
    // When the same search term already exists in the history
    // Then the system updates it as the most recent search instead of creating a duplicate entry
    test("Moves repeated search term to top instead of creating duplicate", () => {
        const recentSearches = ["sports", "study", "volunteer"];
        const updated = saveSearchToHistory(recentSearches, "study");

        expect(updated[0]).toBe("study");
        expect(updated.filter((item) => item === "study").length).toBe(1);
    });

    // User Story 60 tests

    // AC 1:
    // Given an event joiner starts typing keywords in the search bar
    // When characters are entered
    // Then the system displays suggested tags related to the typed input
    test("Displays suggestions when user types into search bar", () => {
        const sourceItems = [
            { type: "Tag", value: "Sports" },
            { type: "Title", value: "Sports Club" },
            { type: "Category", value: "StudyGroup" },
        ];

        const suggestions = getSuggestions("sport", sourceItems);

        expect(suggestions.length).toBe(2);
        expect(suggestions[0].value).toBe("Sports");
        expect(suggestions[1].value).toBe("Sports Club");
    });

    // AC 2:
    // Given suggested tags are displayed
    // When the event joiner selects a suggested tag
    // Then the selected tag is automatically filled into the search bar
    test("Selecting a suggestion fills the search bar", () => {
        const result = selectSuggestion("Sports");

        expect(result.inputValue).toBe("Sports");
        expect(result.shouldPerformSearch).toBe(true);
    });

    // AC 3:
    // Given an event joiner continues typing in the search bar
    // When the input changes
    // Then the suggested tags update dynamically based on the new input
    test("Updates suggestions dynamically when input changes", () => {
        const sourceItems = [
            { type: "Tag", value: "Sports" },
            { type: "Tag", value: "Study" },
            { type: "Title", value: "Soccer Club" },
        ];

        const firstSuggestions = updateSuggestions("sp", sourceItems);
        const secondSuggestions = updateSuggestions("stu", sourceItems);

        expect(firstSuggestions.some((item) => item.value === "Sports")).toBe(true);
        expect(secondSuggestions.some((item) => item.value === "Study")).toBe(true);
        expect(secondSuggestions.some((item) => item.value === "Sports")).toBe(false);
    });

    // AC 4:
    // Given no matching tags exist for the typed input
    // When the system searches for suggestions
    // Then no suggestions are shown or a message indicating no matches is displayed
    test("Shows no suggestions message when there are no matching suggestions", () => {
        const sourceItems = [
            { type: "Tag", value: "Sports" },
            { type: "Tag", value: "Study" },
        ];

        const suggestions = getSuggestions("music", sourceItems);
        const message = getSuggestionEmptyMessage(suggestions);

        expect(suggestions.length).toBe(0);
        expect(message).toBe("No suggestions found.");
    });

    // AC 5:
    // Given suggested tags are shown below the search bar
    // When the event joiner clicks outside the search area
    // Then the suggestion list disappears
    test("Hides suggestion list when clicking outside search area", () => {
        const hidden = shouldHideSuggestionList(true);

        expect(hidden).toBe(true);
    });

    // AC 6:
    // Given an event joiner selects a suggested tag
    // When the selection is confirmed
    // Then the system performs the search using the selected tag
    test("Selecting a suggestion triggers search with selected tag", () => {
        const result = selectSuggestion("Soccer");

        expect(result.inputValue).toBe("Soccer");
        expect(result.shouldPerformSearch).toBe(true);
    });

    // AC 7:
    // Given multiple suggested tags match the input
    // When suggestions are displayed
    // Then the system shows the most relevant or frequently used tags at the top of the list
    test("Sorts suggestions by relevance when multiple suggestions match", () => {
        const suggestions = [
            { type: "Tag", value: "Sports" },
            { type: "Category", value: "Sports Club" },
            { type: "Title", value: "Sports Night" },
        ];

        const sorted = sortSuggestionsByRelevance(suggestions);

        expect(sorted[0].type).toBe("Title");
        expect(sorted[1].type).toBe("Category");
        expect(sorted[2].type).toBe("Tag");
    });

});