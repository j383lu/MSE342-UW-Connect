import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./eventStyles";
import EventCard from "./EventCard";
import { FirebaseContext } from "../../Firebase";

export default function EventsPage() {
  const navigate = useNavigate();
  const firebase = useContext(FirebaseContext);
  const searchBoxRef = useRef(null);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [openDetailsId, setOpenDetailsId] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const [showPastEvents, setShowPastEvents] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [recentSearches, setRecentSearches] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const [sortBy, setSortBy] = useState("mostUpcoming");
  const [activeTab, setActiveTab] = useState("public");

  // This function gets authentication headers and includes the user token if logged in.
  const getAuthHeaders = async (includeJson = false) => {
    const headers = {};

    if (includeJson) {
      headers["Content-Type"] = "application/json";
    }

    const user = firebase?.auth?.currentUser;
    if (user) {
      const token = await user.getIdToken();
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  };

  // Return the correct API route based on the selected tab.
  const getEventsRouteByTab = (tab, includePastValue = true) => {
    const includePastParam = includePastValue ? "true" : "false";

    if (tab === "my-groups") {
      return `/api/events/my-groups?includePast=${includePastParam}`;
    }

    if (tab === "my-events") {
      return `/api/events/my-events?includePast=${includePastParam}`;
    }

    return `/api/events/public?includePast=${includePastParam}`;
  };

  // Update event data in both the main list and search results.
  const updateEventStateEverywhere = (eventId, updates) => {
    setEvents((prev) =>
      prev.map((item) => (item.id === eventId ? { ...item, ...updates } : item))
    );

    setSearchResults((prev) =>
      prev.map((item) => (item.id === eventId ? { ...item, ...updates } : item))
    );
  };

  // This function loads events from the backend based on the selected tab and filter.
  const loadEvents = async (
    tab = activeTab,
    includePastValue = showPastEvents,
    shouldResetSearch = false
  ) => {
    try {
      setLoading(true);
      setError("");

      const headers = await getAuthHeaders(false);
      const route = getEventsRouteByTab(tab, includePastValue);

      const res = await fetch(route, { headers });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load events.");
        setEvents([]);
        return;
      }

      const rows = Array.isArray(data) ? data : [];
      setEvents(rows);

      if (shouldResetSearch) {
        setIsSearching(false);
        setSearchResults([]);
        setSearchMessage("");
      }
    } catch (e) {
      setError("Cannot connect to backend.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // Load attendees of a specific event
  const loadAttendees = async (eventId) => {
    try {
      setDetailsLoading(true);
      setDetailsError("");
      setAttendees([]);

      const headers = await getAuthHeaders(false);
      const res = await fetch(`/api/events/${eventId}/attendees`, { headers });
      const data = await res.json();

      if (!res.ok) {
        setDetailsError(data.error || "Failed to load attendees.");
        return;
      }

      setAttendees(Array.isArray(data) ? data : []);
    } catch (e) {
      setDetailsError("Cannot load attendees.");
    } finally {
      setDetailsLoading(false);
    }
  };

  // This function shows or hides the attendee list for a event.
  const toggleAttendees = async (eventId) => {
    if (openDetailsId === eventId) {
      setOpenDetailsId(null);
      setAttendees([]);
      setDetailsError("");
      return;
    }

    setOpenDetailsId(eventId);
    await loadAttendees(eventId);
  };

  // handleJoin function allows the user to join an event and updates the event state.
  const handleJoin = async (ev) => {
    const user = firebase?.auth?.currentUser;

    if (!user) {
      window.alert("Please log in to join events.");
      return;
    }

    try {
      const headers = await getAuthHeaders(true);

      const res = await fetch(`/api/events/${ev.id}/join`, {
        method: "POST",
        headers,
      });

      const data = await res.json();

      if (!res.ok) {
        window.alert(data.error || "Failed to join.");
        return;
      }

      updateEventStateEverywhere(ev.id, {
        current_count: data.current_count,
        has_joined: 1,
      });

      window.alert(
        data.message || `You have successfully joined the "${ev.title}" event.`
      );

      if (openDetailsId === ev.id) {
        await loadAttendees(ev.id);
      }
    } catch (e) {
      window.alert("Cannot connect to backend.");
    }
  };

  // handleLeave function allows the user to leave an event and updates the event state
  const handleLeave = async (ev) => {
    const user = firebase?.auth?.currentUser;

    if (!user) {
      window.alert("Please log in to leave events.");
      return;
    }

    try {
      const headers = await getAuthHeaders(true);

      const res = await fetch(`/api/events/${ev.id}/leave`, {
        method: "DELETE",
        headers,
      });

      const data = await res.json();

      if (!res.ok) {
        window.alert(data.error || "Failed to leave event.");
        return;
      }

      updateEventStateEverywhere(ev.id, {
        current_count: data.current_count,
        has_joined: 0,
      });

      window.alert(
        data.message || `You have successfully left the "${ev.title}" event.`
      );

      if (openDetailsId === ev.id) {
        await loadAttendees(ev.id);
      }
    } catch (e) {
      window.alert("Cannot connect to backend.");
    }
  };

  // Load user's recent search history from the backend
  const loadRecentSearches = async () => {
    try {
      const headers = await getAuthHeaders(false);
      const res = await fetch("/api/events/search-history", { headers });
      const data = await res.json();

      if (!res.ok) return;
      setRecentSearches(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log("Failed to load recent searches.");
    }
  };

  // Save a new search term into the user's search history
  const saveSearchHistory = async (term) => {
    try {
      const headers = await getAuthHeaders(true);

      await fetch("/api/events/search-history", {
        method: "POST",
        headers,
        body: JSON.stringify({ search_term: term }),
      });
    } catch (e) {
      console.log("Failed to save search history.");
    }
  };

  // Delete a specific search item from user's search history
  const deleteSearchHistory = async (term) => {
    try {
      const headers = await getAuthHeaders(true);

      const res = await fetch("/api/events/search-history", {
        method: "DELETE",
        headers,
        body: JSON.stringify({ search_term: term }),
      });

      const data = await res.json();

      if (!res.ok) {
        window.alert(data.error || "Failed to delete search history.");
        return;
      }

      setRecentSearches((prev) =>
        prev.filter((item) => item.search_term !== term)
      );
    } catch (e) {
      window.alert("Cannot connect to backend.");
    }
  };

  // Load search suggestions based on the keyword input
  const loadSuggestions = async (keyword, tab = activeTab) => {
    try {
      const headers = await getAuthHeaders(false);

      const res = await fetch(
        `/api/events/suggestions?keyword=${encodeURIComponent(keyword)}&tab=${encodeURIComponent(tab)}`,
        { headers }
      );

      const data = await res.json();

      if (!res.ok) {
        setSuggestions([]);
        return;
      }

      setSuggestions(Array.isArray(data) ? data : []);
    } catch (e) {
      setSuggestions([]);
    }
  };

  const getStartDateTime = (ev) => new Date(`${ev.event_date}T${ev.event_time}`);
  const getPublishedDateTime = (ev) => new Date(`${ev.published_time}`);

  // Sort a list of events based on the selected sorting option.
  const applySortToList = useCallback(
    (list, customSort = sortBy) => {
      const copied = [...list];

      if (customSort === "mostLiked") {
        copied.sort((a, b) => {
          const likeDiff = Number(b.likes || 0) - Number(a.likes || 0);
          if (likeDiff !== 0) return likeDiff;
          return getPublishedDateTime(b) - getPublishedDateTime(a);
        });
        return copied;
      }

      if (customSort === "mostRecentPublished") {
        copied.sort((a, b) => getPublishedDateTime(b) - getPublishedDateTime(a));
        return copied;
      }

      copied.sort((a, b) => getStartDateTime(a) - getStartDateTime(b));
      return copied;
    },
    [sortBy]
  );

  // The handleSearch function handles searching events based on the input keyword and updates results.
  const handleSearch = async (rawTerm, customSort = sortBy) => {
    const term = String(rawTerm || "").trim();

    if (!term) {
      setIsSearching(false);
      setSearchResults([]);
      setSearchMessage("");
      return;
    }

    try {
      setSearchLoading(true);
      setSearchMessage("");
      setShowSearchDropdown(false);

      const lowered = term.toLowerCase();

      const matched = events.filter((ev) => {
        const title = String(ev.title || "").toLowerCase();
        const category = String(ev.category || "").toLowerCase();
        const tags = String(ev.tags || "").toLowerCase();
        const description = String(ev.description || "").toLowerCase();
        const eventType = String(ev.event_type || "").toLowerCase();

        return (
          title.includes(lowered) ||
          category.includes(lowered) ||
          tags.includes(lowered) ||
          description.includes(lowered) ||
          eventType.includes(lowered)
        );
      });

      const sortedMatched = applySortToList(matched, customSort);

      setSearchResults(sortedMatched);
      setIsSearching(true);

      if (sortedMatched.length === 0) {
        setSearchMessage("No matching events found.");
      } else {
        setSearchMessage("");
      }

      await saveSearchHistory(term);
      await loadRecentSearches();
    } catch (e) {
      setSearchResults([]);
      setIsSearching(true);
      setSearchMessage("Cannot search events right now.");
    } finally {
      setSearchLoading(false);
    }
  };

  // Update the sorting option and re-applies search if needed.
  const handleSortChange = async (e) => {
    const newSort = e.target.value;
    setSortBy(newSort);

    const currentTerm = searchTerm.trim();
    if (currentTerm) {
      await handleSearch(currentTerm, newSort);
    }
  };

  // Reload search results after updates of likes or joins
  const reloadSearchResultsIfNeeded = async () => {
    const currentTerm = searchTerm.trim();
    if (!currentTerm || !isSearching) return;

    await handleSearch(currentTerm, sortBy);
  };

  // Update event like data and refresh search results
  const handleLikeRefresh = async (eventId, newLikes, newHasLiked) => {
    updateEventStateEverywhere(eventId, {
      likes: newLikes,
      has_liked: newHasLiked ? 1 : 0,
    });

    if (isSearching && searchTerm.trim()) {
      await reloadSearchResultsIfNeeded();
    }
  };

  // This handler function handles input changes and loads suggestions or recent searches
  const handleSearchInputChange = async (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    const cleanValue = value.trim();

    if (!cleanValue) {
      setSuggestions([]);
      await loadRecentSearches();
      setShowSearchDropdown(true);
      return;
    }

    await loadSuggestions(cleanValue, activeTab);
    setShowSearchDropdown(true);
  };

  // When user click the search box, show recent searches or suggestions
  const handleSearchFocus = async () => {
    const cleanValue = searchTerm.trim();

    if (!cleanValue) {
      await loadRecentSearches();
      setSuggestions([]);
    } else {
      await loadSuggestions(cleanValue, activeTab);
    }

    setShowSearchDropdown(true);
  };

  // Handle the search submission
  const handleSearchSubmit = async (e) => {
    e.preventDefault();

    if (!searchTerm.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      setSearchMessage("");
      return;
    }

    await handleSearch(searchTerm);
  };

  const handleRecentSearchClick = async (term) => {
    setSearchTerm(term);
    setShowSearchDropdown(false);
    await handleSearch(term);
  };

  const handleSuggestionClick = async (value) => {
    setSearchTerm(value);
    setShowSearchDropdown(false);
    await handleSearch(value);
  };

  const clearSearch = async () => {
    setSearchTerm("");
    setSuggestions([]);
    setSearchResults([]);
    setSearchMessage("");
    setIsSearching(false);
    setShowSearchDropdown(false);
  };

  // This function switches between tabs and reloads events for the selected section.
  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    setSearchTerm("");
    setSuggestions([]);
    setSearchResults([]);
    setSearchMessage("");
    setIsSearching(false);
    setShowSearchDropdown(false);
    setOpenDetailsId(null);
    setAttendees([]);
    setDetailsError("");
    await loadEvents(tab, showPastEvents, true);
  };

  useEffect(() => {
    loadEvents(activeTab, showPastEvents);
    loadRecentSearches();
  }, []);

  useEffect(() => {
    loadEvents(activeTab, showPastEvents, true);
  }, [showPastEvents]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(event.target)
      ) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const sortedEvents = useMemo(() => {
    return applySortToList(events, sortBy);
  }, [events, sortBy, applySortToList]);

  const upcoming = sortedEvents.filter((e) => Number(e.is_past) === 0);
  const past = sortedEvents.filter((e) => Number(e.is_past) === 1);

  const sortedSearchResults = useMemo(() => {
    return applySortToList(searchResults, sortBy);
  }, [searchResults, sortBy, applySortToList]);

  const upcomingSearchResults = sortedSearchResults.filter(
    (e) => Number(e.is_past) === 0
  );

  const pastSearchResults = sortedSearchResults.filter(
    (e) => Number(e.is_past) === 1
  );

  const renderCard = (ev, isPast) => {
    const isOpen = openDetailsId === ev.id;

    return (
      <EventCard
        key={ev.id}
        ev={ev}
        isPast={isPast}
        isOpen={isOpen}
        attendees={attendees}
        detailsLoading={detailsLoading}
        detailsError={detailsError}
        toggleAttendees={toggleAttendees}
        handleJoin={handleJoin}
        handleLeave={handleLeave}
        onLikeSuccess={handleLikeRefresh}
      />
    );
  };

  const sectionTitle =
    activeTab === "my-groups"
      ? "My Group Events"
      : activeTab === "my-events"
      ? "My Events"
      : "Upcoming Events";

  const sectionSubtitle =
    activeTab === "my-groups"
      ? "Events created for groups you have joined."
      : activeTab === "my-events"
      ? "Events you created or joined."
      : "Public events available to the campus community.";

  const searchSubtitleText =
    sortBy === "mostLiked"
      ? "Results are sorted from highest to lowest number of likes within this section."
      : sortBy === "mostRecentPublished"
      ? "Results are sorted from most recently published to least recently published within this section."
      : "Results are sorted from earliest start date and time to latest start date and time within this section.";

  const emptyUpcomingTitle =
    activeTab === "my-groups"
      ? "No group events"
      : activeTab === "my-events"
      ? "No events found for you"
      : "No upcoming events";

  const emptyUpcomingText =
    activeTab === "my-groups"
      ? "You are not currently in any groups, or no group events match yet."
      : activeTab === "my-events"
      ? "Events you create or join will appear here."
      : "Create a new event to get started.";

  const emptyPastTitle =
    activeTab === "my-groups"
      ? "No past group events"
      : activeTab === "my-events"
      ? "No past events found for you"
      : "No past events";

  return (
    <div style={styles.pageBackground}>
      <div style={styles.pageWrapper}>
        <div style={styles.hero}>
          <div style={styles.heroGlowOne} />
          <div style={styles.heroGlowTwo} />
          <div style={styles.heroOverlay} />

          <div style={styles.heroContent}>
            <div style={styles.heroTextBlock}>
              <div style={styles.heroEyebrow}>UW Connect</div>
              <h1 style={styles.heroTitle}>Discover Campus Events</h1>
              <p style={styles.heroSubtitle}>
                Explore upcoming activities, join student events, and stay
                connected with the campus community.
              </p>
            </div>

            <div style={styles.heroActionRow}>
              <button
                style={styles.heroSecondaryBtn}
                onClick={() => loadEvents(activeTab, showPastEvents, false)}
              >
                Refresh
              </button>

              <button
                style={styles.heroPrimaryBtn}
                onClick={() => navigate("/events/new")}
              >
                Create Event
              </button>
            </div>
          </div>
        </div>

        {error ? <div style={styles.errorBanner}>{error}</div> : null}

        <div style={styles.searchPanel}>
          <div style={styles.searchHeaderBlock}>
            <h2 style={styles.panelTitle}>Search Events</h2>
            <p style={styles.panelSubtitle}>
              Search by event title, category, tags, description, or event type
              within the current section.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
            <div style={styles.searchBox} ref={searchBoxRef}>
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchInputChange}
                onFocus={handleSearchFocus}
                placeholder="Search by title, category, tag, or event type"
                style={styles.searchInput}
              />

              {showSearchDropdown ? (
                <div style={styles.searchDropdown}>
                  {searchTerm.trim() === "" ? (
                    <>
                      <div style={styles.searchDropdownTitle}>
                        Recent Searches
                      </div>

                      {recentSearches.length === 0 ? (
                        <div style={styles.searchDropdownEmpty}>
                          No recent searches yet.
                        </div>
                      ) : (
                        recentSearches.map((item) => (
                          <div
                            key={item.search_term}
                            style={styles.searchDropdownRow}
                          >
                            <button
                              type="button"
                              style={styles.searchDropdownItem}
                              onClick={() =>
                                handleRecentSearchClick(item.search_term)
                              }
                            >
                              {item.search_term}
                            </button>

                            <button
                              type="button"
                              style={styles.searchDeleteBtn}
                              onClick={() =>
                                deleteSearchHistory(item.search_term)
                              }
                            >
                              ×
                            </button>
                          </div>
                        ))
                      )}
                    </>
                  ) : (
                    <>
                      <div style={styles.searchDropdownTitle}>
                        Suggested Results
                      </div>

                      {suggestions.length === 0 ? (
                        <div style={styles.searchDropdownEmpty}>
                          No suggestions found.
                        </div>
                      ) : (
                        suggestions.map((item, index) => (
                          <button
                            key={`${item.type}-${item.value}-${index}`}
                            type="button"
                            style={styles.searchSuggestionBtn}
                            onClick={() => handleSuggestionClick(item.value)}
                          >
                            <span style={styles.searchSuggestionType}>
                              {item.type}
                            </span>
                            <span style={styles.searchSuggestionValue}>
                              {item.value}
                            </span>
                          </button>
                        ))
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </div>

            <select
              value={sortBy}
              onChange={handleSortChange}
              style={styles.sortSelect}
            >
              <option value="mostUpcoming">Most Upcoming</option>
              <option value="mostRecentPublished">Most Recent Published</option>
              <option value="mostLiked">Sort by Likes</option>
            </select>

            <button type="submit" style={styles.searchBtn}>
              Search
            </button>

            <button
              type="button"
              style={styles.clearSearchBtn}
              onClick={clearSearch}
            >
              Clear
            </button>
          </form>
        </div>

        <div style={styles.panel}>
          <div style={styles.sectionHeaderBlock}>
            <h2 style={styles.panelTitle}>Browse Event Sections</h2>
            <p style={styles.panelSubtitle}>
              Switch between public events, your group events, and your own event activity.
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => handleTabChange("public")}
              style={{
                ...styles.filterChip,
                ...(activeTab === "public" ? styles.filterChipActive : {}),
              }}
            >
              Upcoming Events
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("my-groups")}
              style={{
                ...styles.filterChip,
                ...(activeTab === "my-groups" ? styles.filterChipActive : {}),
              }}
            >
              My Group Events
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("my-events")}
              style={{
                ...styles.filterChip,
                ...(activeTab === "my-events" ? styles.filterChipActive : {}),
              }}
            >
              My Events
            </button>
          </div>
        </div>

        {isSearching ? (
          <div style={styles.panel}>
            <div style={styles.sectionHeaderBlock}>
              <h2 style={styles.panelTitle}>
                Search Results, {sectionTitle}
              </h2>
              <p style={styles.panelSubtitle}>{searchSubtitleText}</p>
            </div>

            {searchLoading ? (
              <p style={styles.infoText}>Searching...</p>
            ) : searchMessage ? (
              <div style={styles.emptyStateCard}>
                <div style={styles.emptyStateTitle}>{searchMessage}</div>
              </div>
            ) : sortedSearchResults.length === 0 ? (
              <div style={styles.emptyStateCard}>
                <div style={styles.emptyStateTitle}>No matching events</div>
                <div style={styles.emptyStateText}>
                  Try another keyword, category, or tag.
                </div>
              </div>
            ) : (
              <>
                <div style={styles.sectionHeaderBlock}>
                  <h2 style={styles.panelTitle}>Upcoming Search Results</h2>
                </div>

                {upcomingSearchResults.length === 0 ? (
                  <div style={styles.emptyStateCard}>
                    <div style={styles.emptyStateTitle}>
                      No upcoming matching events
                    </div>
                  </div>
                ) : (
                  <div style={styles.grid}>
                    {upcomingSearchResults.map((ev) => renderCard(ev, false))}
                  </div>
                )}

                {showPastEvents ? (
                  <>
                    <div style={styles.sectionDivider} />

                    <div style={styles.sectionHeaderBlock}>
                      <h2 style={styles.panelTitle}>Past Search Results</h2>
                    </div>

                    {pastSearchResults.length === 0 ? (
                      <div style={styles.emptyStateCard}>
                        <div style={styles.emptyStateTitle}>
                          No past matching events
                        </div>
                      </div>
                    ) : (
                      <div style={styles.grid}>
                        {pastSearchResults.map((ev) => renderCard(ev, true))}
                      </div>
                    )}
                  </>
                ) : null}
              </>
            )}
          </div>
        ) : (
          <div style={styles.panel}>
            <div style={styles.panelTitleRow}>
              <div>
                <h2 style={styles.panelTitle}>{sectionTitle}</h2>
                <p style={styles.panelSubtitle}>
                  {sortBy === "mostLiked"
                    ? `${sectionSubtitle} Results are currently sorted by likes.`
                    : sortBy === "mostRecentPublished"
                    ? `${sectionSubtitle} Results are currently sorted by publish time.`
                    : `${sectionSubtitle} Results are currently sorted by start date and time.`}
                </p>
              </div>

              <button
                style={styles.toggleBtn}
                onClick={() => setShowPastEvents((v) => !v)}
              >
                {showPastEvents ? "Hide Past Events" : "Show Past Events"}
              </button>
            </div>

            {loading ? (
              <p style={styles.infoText}>Loading...</p>
            ) : upcoming.length === 0 ? (
              <div style={styles.emptyStateCard}>
                <div style={styles.emptyStateTitle}>{emptyUpcomingTitle}</div>
                <div style={styles.emptyStateText}>{emptyUpcomingText}</div>
              </div>
            ) : (
              <div style={styles.grid}>
                {upcoming.map((ev) => renderCard(ev, false))}
              </div>
            )}

            {showPastEvents ? (
              <>
                <div style={styles.sectionDivider} />

                <div style={styles.sectionHeaderBlock}>
                  <h2 style={styles.panelTitle}>Past Events</h2>
                  <p style={styles.panelSubtitle}>
                    Review previous events and attendee details.
                  </p>
                </div>

                {loading ? null : past.length === 0 ? (
                  <div style={styles.emptyStateCard}>
                    <div style={styles.emptyStateTitle}>{emptyPastTitle}</div>
                    <div style={styles.emptyStateText}>
                      Past events will appear here automatically.
                    </div>
                  </div>
                ) : (
                  <div style={styles.grid}>
                    {past.map((ev) => renderCard(ev, true))}
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}