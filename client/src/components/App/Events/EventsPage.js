import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EventCard from "./EventCard";
import styles from "./eventStyles";

export default function EventsPage() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [openDetailsId, setOpenDetailsId] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const [showPastEvents, setShowPastEvents] = useState(true);

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

      if (openDetailsId === ev.id) {
        await loadAttendees(ev.id);
      }
    } catch (e) {
      window.alert("Cannot connect to backend.");
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const upcoming = events.filter((e) => Number(e.is_past) === 0);
  const past = events.filter((e) => Number(e.is_past) === 1);

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
      />
    );
  };

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

        <div style={styles.panel}>
          <div style={styles.panelTitleRow}>
            <div>
              <h2 style={styles.panelTitle}>Upcoming Events</h2>
              <p style={styles.panelSubtitle}>
                Find what is happening next and join in quickly.
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
            <div style={styles.grid}>{upcoming.map((ev) => renderCard(ev, false))}</div>
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
                <div style={styles.grid}>{past.map((ev) => renderCard(ev, true))}</div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}