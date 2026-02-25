import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function EventsPage() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [openDetailsId, setOpenDetailsId] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/events");
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load events.");
        setEvents([]);
        return;
      }

      setEvents(data);
    } catch (err) {
      setError("Cannot connect to backend. Is your server running?");
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

  const handleToggleAttendees = async (eventId) => {
    if (openDetailsId === eventId) {
      // close dropdown
      setOpenDetailsId(null);
      setAttendees([]);
      setDetailsError("");
      return;
    }
    // open dropdown
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

      // update count locally
      setEvents((prev) =>
        prev.map((x) =>
          x.id === ev.id ? { ...x, current_count: data.current_count } : x
        )
      );

      // if dropdown is open, reload attendees
      if (openDetailsId === ev.id) {
        await loadAttendees(ev.id);
      }
    } catch (e) {
      window.alert("Cannot connect to backend.");
    }
  };

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={{ margin: 0 }}>Events</h2>
          <p style={{ marginTop: 6, color: "#555" }}>Upcoming events (Sprint 1).</p>
        </div>

        <button style={styles.primaryBtn} onClick={() => navigate("/events/new")}>
          Create Event
        </button>
      </div>

      {error ? <div style={styles.errorText}>{error}</div> : null}

      <div style={styles.panel}>
        <div style={styles.panelTitle}>Upcoming Events</div>

        {loading ? (
          <p>Loading...</p>
        ) : events.length === 0 ? (
          <p>No upcoming events.</p>
        ) : (
          <div style={styles.grid}>
            {events.map((ev) => {
              const current = Number(ev.current_count || 0);
              const max = Number(ev.capacity || 0);
              const isFull = max > 0 && current >= max;
              const isOpen = openDetailsId === ev.id;

              return (
                <div key={ev.id} style={styles.card}>
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
                      <div style={styles.capacityHint}>
                        {isFull ? "Full" : "Spots"}
                      </div>
                    </div>
                  </div>

                  <div style={styles.desc}>{ev.description}</div>

                  <div style={styles.actions}>
                    <button
                      style={{
                        ...styles.joinBtn,
                        ...(isFull ? styles.joinBtnDisabled : null),
                      }}
                      disabled={isFull}
                      onClick={() => handleJoin(ev)}
                    >
                      Join Now
                    </button>

                    <button
                      style={styles.detailsBtn}
                      onClick={() => handleToggleAttendees(ev.id)}
                    >
                      {isOpen ? "Hide Attendees" : "Show Attendees"}
                    </button>
                  </div>

                  {/* Dropdown area */}
                  <div
                    style={{
                      ...styles.dropdown,
                      ...(isOpen ? styles.dropdownOpen : styles.dropdownClosed),
                    }}
                  >
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
            })}
          </div>
        )}
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
  panelTitle: { fontWeight: "bold", marginBottom: 12, fontSize: 16 },
  grid: { display: "grid", gridTemplateColumns: "1fr", gap: 12 },
  card: {
    border: "1px solid #eee",
    borderRadius: 14,
    padding: 14,
    background: "white",
    boxShadow: "0 6px 16px rgba(0,0,0,0.05)",
  },
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
  dropdownClosed: {
    maxHeight: 0,
    opacity: 0,
  },
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