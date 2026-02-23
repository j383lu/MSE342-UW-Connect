import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function EventsPage() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_BASE = "http://localhost:3001";

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_BASE}/api/events`);
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

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={{ margin: 0 }}>Events</h2>
          <p style={{ marginTop: 6, color: "#555" }}>Upcoming events (Sprint 1).</p>
        </div>

        <button style={styles.button} onClick={() => navigate("/events/new")}>
          Create Event
        </button>
      </div>

      {error ? <div style={{ color: "red", marginBottom: 10 }}>{error}</div> : null}

      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Upcoming Events</h3>

        {loading ? (
          <p>Loading...</p>
        ) : events.length === 0 ? (
          <p>No upcoming events.</p>
        ) : (
          events.map((ev) => (
            <div key={ev.id} style={styles.eventCard}>
              <div style={{ fontWeight: "bold" }}>{ev.title}</div>
              <div style={{ color: "#555", fontSize: 13 }}>
                {ev.event_date} {ev.event_time} | {ev.location}
              </div>
              <div style={{ marginTop: 6 }}>{ev.description}</div>
              <div style={{ marginTop: 8, fontSize: 13 }}>Capacity: {ev.capacity}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  button: {
    height: 38,
    borderRadius: 6,
    border: "none",
    background: "black",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    padding: "0 14px",
  },
  card: {
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: 12,
    background: "white",
  },
  eventCard: {
    border: "1px solid #eee",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
};