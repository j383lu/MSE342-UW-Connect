import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function EventsPage() {
  const navigate = useNavigate();

  // Main event list states
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Attendees states
  const [openDetailsId, setOpenDetailsId] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  // Show/hide past events section
  const [showPastEvents, setShowPastEvents] = useState(true);

  // Return the correct format of time and dates
  const todayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Load events from backend
  const loadEvents = async () => {
    try {
      setLoading(true);
      setError("");

      // Set includePast=true to return all the events
      const res = await fetch("/api/events?includePast=true");
      const data = await res.json();

      // Backend error handling
      if (!res.ok) {
        setError(data.error || "Failed to load events.");
        setEvents([]);
        return;
      }

      // Stores the events in an array
      // Backend error handling
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      setError("Cannot connect to backend");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // Load attendees for a specific event
  const loadAttendees = async (eventId) => {
    try {
      setDetailsLoading(true);
      setDetailsError("");
      setAttendees([]);

      // Use the correct api
      const res = await fetch(`/api/events/${eventId}/attendees`);
      const data = await res.json();

      // Handle load attendees errors
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

  // Since the log in authentication part has not been created yet, user can type their name to join now.
  // This will be updated in next sprint

  // Join event flow
  // Ask user for their name (For now only)
  // Use the correct api: POST /api/events/:id/join
  // Update the current_count in UI
  // If attendees panel is open, reload it to show the new attendee
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
        prev.map((x) => (x.id === ev.id ? { ...x, current_count: data.current_count } : x))
      );

      if (openDetailsId === ev.id) await loadAttendees(ev.id);
    } catch (e) {
      window.alert("Cannot connect to backend.");
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const tStr = todayStr();

  // Split events into upcoming + past
  const upcoming = events.filter((e) => Number(e.is_past) === 0);
  const past = events.filter((e) => Number(e.is_past) === 1);

  // Render one event card
  const renderCard = (ev, isPast) => {
    const current = Number(ev.current_count || 0);
    const max = Number(ev.capacity || 0);
    const isFull = max > 0 && current >= max;
    const isOpen = openDetailsId === ev.id;

    return (
      <div key={ev.id} style={{ ...styles.card, ...(isPast ? styles.cardPast : null) }}>
        <div style={styles.cardTop}>
          <div>
            <div style={styles.title}>{ev.title}</div>

            <div style={styles.metaBlock}>
              <div style={styles.metaLine}>
                <span style={styles.metaLabel}>Date</span>
                <span style={styles.metaValue}>{ev.event_date}</span>
              </div>
              <div style={styles.metaLine}>
                <span style={styles.metaLabel}>Time</span>
                <span style={styles.metaValue}>{ev.event_time}</span>
              </div>
              <div style={styles.metaLine}>
                <span style={styles.metaLabel}>Location</span>
                <span style={styles.metaValue}>{ev.location}</span>
              </div>
            </div>
          </div>

          <div style={styles.rightBox}>
            <div style={styles.capacity}>
              {current}/{max}
            </div>
            <div style={styles.capacityHint}>{isPast ? "Ended" : isFull ? "Full" : "Spots"}</div>
          </div>
        </div>

        <div style={styles.desc}>{ev.description}</div>

        <div style={styles.actions}>
          <button
            style={{ ...styles.joinBtn, ...(isFull || isPast ? styles.joinBtnDisabled : null) }}
            disabled={isFull || isPast}
            onClick={() => handleJoin(ev)}
          >
            Join Now
          </button>

          <button style={styles.detailsBtn} onClick={() => toggleAttendees(ev.id)}>
            {isOpen ? "Hide Attendees" : "Show Attendees"}
          </button>
        </div>

        <div style={{ ...styles.dropdown, ...(isOpen ? styles.dropdownOpen : styles.dropdownClosed) }}>
          {isOpen ? (
            <>
              <div style={styles.detailsTitle}>Attendees</div>

              {detailsError ? (
                <div style={styles.errorText}>{detailsError}</div>
              ) : detailsLoading ? (
                <div>Loading attendees...</div>
              ) : attendees.length === 0 ? (
                <div style={{ color: "#666" }}>No one has joined yet.</div>
              ) : (
                <ul style={styles.list}>
                  {attendees.map((a, idx) => (
                    <li key={idx} style={styles.listItem}>
                      {a.attendee_name}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={{ margin: 0 }}>Events</h2>
          <p style={{ marginTop: 6, color: "#555" }}>Upcoming and past events (Sprint 1).</p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button style={styles.secondarySmallBtn} onClick={loadEvents}>
            Refresh
          </button>
          <button style={styles.primaryBtn} onClick={() => navigate("/events/new")}>
            Create Event
          </button>
        </div>
      </div>

      {error ? <div style={styles.errorText}>{error}</div> : null}

      <div style={styles.panel}>
        <div style={styles.panelTitleRow}>
          <div style={styles.panelTitle}>Upcoming Events</div>

          <button style={styles.toggleBtn} onClick={() => setShowPastEvents((v) => !v)}>
            {showPastEvents ? "Hide Past Events" : "Show Past Events"}
          </button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : upcoming.length === 0 ? (
          <p>No upcoming events.</p>
        ) : (
          <div style={styles.grid}>{upcoming.map((ev) => renderCard(ev, false))}</div>
        )}

        {showPastEvents ? (
          <>
            <div style={{ height: 18 }} />
            <div style={styles.panelTitle}>Past Events</div>

            {loading ? null : past.length === 0 ? (
              <p style={{ color: "#666" }}>No past events.</p>
            ) : (
              <div style={styles.grid}>{past.map((ev) => renderCard(ev, true))}</div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: 16 },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  panel: {
    border: "1px solid #ddd",
    borderRadius: 14,
    padding: 14,
    background: "white",
    boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
  },
  panelTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  panelTitle: { fontWeight: "bold", marginBottom: 12, fontSize: 16 },
  grid: { display: "grid", gridTemplateColumns: "1fr", gap: 12 },

  card: {
    border: "1px solid #eee",
    borderRadius: 14,
    padding: 14,
    background: "white",
    boxShadow: "0 6px 16px rgba(0,0,0,0.05)",
  },
  cardPast: { opacity: 0.75, background: "#fafafa" },

  cardTop: { display: "flex", justifyContent: "space-between", gap: 12 },
  title: { fontWeight: "bold", fontSize: 16, marginBottom: 8 },
  metaBlock: { display: "grid", gap: 6 },
  metaLine: { display: "flex", gap: 10 },
  metaLabel: { width: 70, fontSize: 12, color: "#666", fontWeight: "bold" },
  metaValue: { fontSize: 13, color: "#222" },

  rightBox: { minWidth: 90, textAlign: "right" },
  capacity: { fontSize: 18, fontWeight: "bold" },
  capacityHint: { fontSize: 12, color: "#666" },

  desc: { marginTop: 12, color: "#222" },

  actions: { marginTop: 14, display: "flex", gap: 10 },

  primaryBtn: {
    height: 38,
    borderRadius: 10,
    border: "none",
    background: "black",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    padding: "0 14px",
  },
  secondarySmallBtn: {
    height: 38,
    borderRadius: 10,
    border: "1px solid #bbb",
    background: "white",
    color: "#111",
    fontWeight: "bold",
    cursor: "pointer",
    padding: "0 14px",
  },
  toggleBtn: {
    height: 34,
    borderRadius: 10,
    border: "1px solid #bbb",
    background: "white",
    color: "#111",
    fontWeight: "bold",
    cursor: "pointer",
    padding: "0 12px",
    whiteSpace: "nowrap",
  },

  joinBtn: {
    height: 36,
    borderRadius: 10,
    border: "none",
    background: "black",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    padding: "0 12px",
  },
  joinBtnDisabled: { background: "#999", cursor: "not-allowed" },

  detailsBtn: {
    height: 36,
    borderRadius: 10,
    border: "1px solid #bbb",
    background: "white",
    color: "#111",
    fontWeight: "bold",
    cursor: "pointer",
    padding: "0 12px",
  },

  dropdown: {
    overflow: "hidden",
    transition: "max-height 200ms ease, opacity 200ms ease",
  },
  dropdownClosed: { maxHeight: 0, opacity: 0 },
  dropdownOpen: {
    maxHeight: 300,
    opacity: 1,
    marginTop: 12,
    borderTop: "1px solid #eee",
    paddingTop: 12,
  },

  detailsTitle: { fontWeight: "bold", marginBottom: 8 },
  list: { margin: 0, paddingLeft: 18 },
  listItem: { marginBottom: 6 },
  errorText: { color: "red", marginBottom: 10 },
};