import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import EventCard from "./EventCard";
import styles from "./eventStyles";

export default function EventsPage() {
  const navigate = useNavigate();
  const searchBoxRef = useRef(null);

  const USER_ID = 1;

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

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/events?includePast=true");
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load events.");
        setEvents([]);
        return;
      }

      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      setError("Cannot connect to backend.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendees = async (eventId) => {
    try {
      setDetailsLoading(true);
      setDetailsError("");
      setAttendees([]);

      const res = await fetch(`/api/events/${eventId}/attendees`);
      const data = await res.json();

      if (!res.ok) {
        setDetailsError(data.error || "Failed to load attendees.");
        return;
      }

      setAttendees(data);
    } catch (e) {
      setDetailsError("Cannot load attendees.");
    } finally {
      setDetailsLoading(false);
    }
  };

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

  const handleJoin = async (ev) => {
    const name = window.prompt("Enter your name to join this event:");
    if (!name) return;

    try {
      const res = await fetch(`/api/events/${ev.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendee_name: name }),
      });

      const data = await res.json();

      if (!res.ok) {
        window.alert(data.error || "Failed to join.");
        return;
      }

      setEvents((prev) =>
        prev.map((x) =>
          x.id === ev.id ? { ...x, current_count: data.current_count } : x
        )
      );

      setSearchResults((prev) =>
        prev.map((x) =>
          x.id === ev.id ? { ...x, current_count: data.current_count } : x
        )
      );

      if (openDetailsId === ev.id) {
        await loadAttendees(ev.id);
      }
    } catch (e) {
      window.alert("Cannot connect to backend.");
    }
  };

  const loadRecentSearches = async () => {
    try {
      const res = await fetch(`/api/events/search-history?user_id=${USER_ID}`);
      const data = await res.json();

      if (!res.ok) return;

      setRecentSearches(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log("Failed to load recent searches.");
    }
  };

  const saveSearchHistory = async (term) => {
    try {
      await fetch("/api/events/search-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: USER_ID,
          search_term: term,
        }),
      });
    } catch (e) {
      console.log("Failed to save search history.");
    }
  };

  const deleteSearchHistory = async (term) => {
    try {
      const res = await fetch("/api/events/search-history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: USER_ID,
          search_term: term,
        }),
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

  const loadSuggestions = async (keyword) => {
    try {
      const res = await fetch(
        `/api/events/suggestions?keyword=${encodeURIComponent(keyword)}`
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

      const res = await fetch(
        `/api/events/search?keyword=${encodeURIComponent(
          term
        )}&sort=${encodeURIComponent(customSort)}`
      );
      const data = await res.json();

      if (!res.ok) {
        setSearchResults([]);
        setIsSearching(true);
        setSearchMessage(data.error || "Failed to search events.");
        return;
      }

      setSearchResults(Array.isArray(data.events) ? data.events : []);
      setIsSearching(true);

      if (Array.isArray(data.events) && data.events.length === 0) {
        setSearchMessage("No matching events found.");
      } else {
        setSearchMessage("");
      }

      await saveSearchHistory(term);
      await loadRecentSearches();
    } catch (e) {
      setSearchResults([]);
      setIsSearching(true);
      setSearchMessage("Cannot connect to backend.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSortChange = async (e) => {
    const newSort = e.target.value;
    setSortBy(newSort);

    const currentTerm = searchTerm.trim();

    if (currentTerm) {
      await handleSearch(currentTerm, newSort);
    }
  };

  const reloadSearchResultsIfNeeded = async () => {
    const currentTerm = searchTerm.trim();

    if (!currentTerm || !isSearching) return;

    try {
      const res = await fetch(
        `/api/events/search?keyword=${encodeURIComponent(
          currentTerm
        )}&sort=${encodeURIComponent(sortBy)}`
      );
      const data = await res.json();

      if (!res.ok) return;

      setSearchResults(Array.isArray(data.events) ? data.events : []);
    } catch (e) {
      console.log("Failed to reload search results.");
    }
  };

  const handleLikeRefresh = async (eventId, newLikes) => {
    setEvents((prev) =>
      prev.map((item) =>
        item.id === eventId ? { ...item, likes: newLikes } : item
      )
    );

    setSearchResults((prev) =>
      prev.map((item) =>
        item.id === eventId ? { ...item, likes: newLikes } : item
      )
    );

    if (isSearching && searchTerm.trim()) {
      await reloadSearchResultsIfNeeded();
    }
  };

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

    await loadSuggestions(cleanValue);
    setShowSearchDropdown(true);
  };

  const handleSearchFocus = async () => {
    const cleanValue = searchTerm.trim();

    if (!cleanValue) {
      await loadRecentSearches();
      setSuggestions([]);
    } else {
      await loadSuggestions(cleanValue);
    }

    setShowSearchDropdown(true);
  };

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
    await loadEvents();
  };

  useEffect(() => {
    loadEvents();
    loadRecentSearches();
  }, []);

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
    const copied = [...events];

    if (sortBy === "mostLiked") {
      copied.sort((a, b) => {
        const likeDiff = Number(b.likes || 0) - Number(a.likes || 0);
        if (likeDiff !== 0) return likeDiff;

        const bTime = new Date(`${b.published_time}`);
        const aTime = new Date(`${a.published_time}`);
        return bTime - aTime;
      });
      return copied;
    }

    if (sortBy === "mostRecentPublished") {
      copied.sort((a, b) => {
        const bTime = new Date(`${b.published_time}`);
        const aTime = new Date(`${a.published_time}`);
        return bTime - aTime;
      });
      return copied;
    }

    copied.sort((a, b) => {
      const aTime = new Date(`${a.event_date}T${a.event_time}`);
      const bTime = new Date(`${b.event_date}T${b.event_time}`);
      return aTime - bTime;
    });

    return copied;
  }, [events, sortBy]);

  const upcoming = sortedEvents.filter((e) => Number(e.is_past) === 0);
  const past = sortedEvents.filter((e) => Number(e.is_past) === 1);

  const upcomingSearchResults = searchResults.filter(
    (e) => Number(e.is_past) === 0
  );

  const pastSearchResults = searchResults.filter(
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
        onLikeSuccess={handleLikeRefresh}
      />
    );
  };

  const searchSubtitleText =
    sortBy === "mostLiked"
      ? "Results are sorted from highest to lowest number of likes within each section."
      : sortBy === "mostRecentPublished"
      ? "Results are sorted from most recently published to least recently published within each section."
      : "Results are sorted from earliest upcoming event to latest upcoming event within each section.";

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
              <button style={styles.heroSecondaryBtn} onClick={loadEvents}>
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
              Search by event title, category, or tags. Recent searches will
              appear when the search bar is empty.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
            <div style={styles.searchBox} ref={searchBoxRef}>
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchInputChange}
                onFocus={handleSearchFocus}
                placeholder="Search by title, category, or tag"
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

        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryNumber}>{upcoming.length}</div>
            <div style={styles.summaryLabel}>Upcoming Events</div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryNumber}>{past.length}</div>
            <div style={styles.summaryLabel}>Past Events</div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryNumber}>{events.length}</div>
            <div style={styles.summaryLabel}>Total Events</div>
          </div>
        </div>

        {isSearching ? (
          <div style={styles.panel}>
            <div style={styles.sectionHeaderBlock}>
              <h2 style={styles.panelTitle}>Search Results</h2>
              <p style={styles.panelSubtitle}>{searchSubtitleText}</p>
            </div>

            {searchLoading ? (
              <p style={styles.infoText}>Searching...</p>
            ) : searchMessage ? (
              <div style={styles.emptyStateCard}>
                <div style={styles.emptyStateTitle}>{searchMessage}</div>
              </div>
            ) : searchResults.length === 0 ? (
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
                  <p style={styles.panelSubtitle}>
                    Matching upcoming events based on your current search and
                    sort option.
                  </p>
                </div>

                {upcomingSearchResults.length === 0 ? (
                  <div style={styles.emptyStateCard}>
                    <div style={styles.emptyStateTitle}>
                      No upcoming matching events
                    </div>
                    <div style={styles.emptyStateText}>
                      Try another keyword or check past search results below.
                    </div>
                  </div>
                ) : (
                  <div style={styles.grid}>
                    {upcomingSearchResults.map((ev) => renderCard(ev, false))}
                  </div>
                )}

                <div style={styles.sectionDivider} />

                <div style={styles.sectionHeaderBlock}>
                  <h2 style={styles.panelTitle}>Past Search Results</h2>
                  <p style={styles.panelSubtitle}>
                    Matching past events based on your current search and sort
                    option.
                  </p>
                </div>

                {pastSearchResults.length === 0 ? (
                  <div style={styles.emptyStateCard}>
                    <div style={styles.emptyStateTitle}>
                      No past matching events
                    </div>
                    <div style={styles.emptyStateText}>
                      There are no matching past events for this search.
                    </div>
                  </div>
                ) : (
                  <div style={styles.grid}>
                    {pastSearchResults.map((ev) => renderCard(ev, true))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div style={styles.panel}>
            <div style={styles.panelTitleRow}>
              <div>
                <h2 style={styles.panelTitle}>Upcoming Events</h2>
                <p style={styles.panelSubtitle}>
                  {sortBy === "mostLiked"
                    ? "Events are currently sorted by likes."
                    : sortBy === "mostRecentPublished"
                    ? "Events are currently sorted by publish time."
                    : "Events are currently sorted by upcoming event time."}
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
                <div style={styles.emptyStateTitle}>No upcoming events</div>
                <div style={styles.emptyStateText}>
                  Create a new event to get started.
                </div>
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
                    <div style={styles.emptyStateTitle}>No past events</div>
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