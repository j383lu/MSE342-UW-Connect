import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CreateEventForm() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!title || !description || !eventDate || !eventTime || !location || !capacity) {
      setError("Please fill in all fields.");
      return;
    }

    const capNum = Number(capacity);
    if (!Number.isInteger(capNum) || capNum <= 0) {
      setError("Capacity must be a positive integer.");
      return;
    }

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          event_date: eventDate,
          event_time: eventTime,
          location,
          capacity: capNum,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create event.");
        return;
      }

      setMessage("Event created!");
      setTimeout(() => navigate("/events"), 600);
    } catch (e2) {
      setError("Cannot connect to backend.");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.heroCard}>
          <div>
            <h1 style={styles.pageTitle}>Create Event</h1>
            <p style={styles.pageSubtitle}>Create an event post with max RSVP capacity.</p>
          </div>

          <button
            type="button"
            style={styles.outlineButton}
            onClick={() => navigate("/events")}
          >
            Back
          </button>
        </div>

        {error ? <div style={styles.errorText}>{error}</div> : null}
        {message ? <div style={styles.successText}>{message}</div> : null}

        <div style={styles.formCard}>
          <form onSubmit={handleCreate} style={styles.form}>
            <label style={styles.label}>
              Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={styles.textarea}
                rows={5}
              />
            </label>

            <div style={styles.row}>
              <label style={styles.label}>
                Date
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  style={styles.input}
                />
              </label>

              <label style={styles.label}>
                Time
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  style={styles.input}
                />
              </label>
            </div>

            <label style={styles.label}>
              Location
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Max RSVP Spots
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                style={styles.input}
              />
            </label>

            <button type="submit" style={styles.primaryButton}>
              Create
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#FDFDF6",
    padding: "24px 20px 40px",
  },
  container: {
    maxWidth: 980,
    margin: "0 auto",
  },
  heroCard: {
    background: "#FFFFFF",
    border: "1px solid #D6DFE2",
    borderLeft: "6px solid #5D6C5C",
    borderRadius: 24,
    padding: "28px 32px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    boxShadow: "0px 4px 14px rgba(0,0,0,0.05)",
    marginBottom: 28,
  },
  pageTitle: {
    margin: 0,
    fontSize: "2.4rem",
    fontWeight: 700,
    color: "#17292B",
  },
  pageSubtitle: {
    marginTop: 8,
    marginBottom: 0,
    color: "#686967",
    fontSize: "1rem",
  },
  formCard: {
    background: "#FFFFFF",
    border: "1px solid #D6DFE2",
    borderRadius: 24,
    padding: 28,
    boxShadow: "0px 4px 14px rgba(0,0,0,0.05)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
    color: "#17292B",
  },
  input: {
    width: "100%",
    height: 42,
    padding: "0 12px",
    border: "1px solid #D6DFE2",
    borderRadius: 10,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
  },
  textarea: {
    width: "100%",
    padding: 12,
    border: "1px solid #D6DFE2",
    borderRadius: 10,
    fontSize: 14,
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
    background: "#fff",
  },
  primaryButton: {
    height: 42,
    borderRadius: 12,
    border: "none",
    background: "#17292B",
    color: "#FDFDF6",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    marginTop: 6,
  },
  outlineButton: {
    height: 42,
    borderRadius: 999,
    border: "2px solid #5D6C5C",
    background: "#FFFFFF",
    color: "#17292B",
    fontWeight: 700,
    cursor: "pointer",
    padding: "0 22px",
    whiteSpace: "nowrap",
  },
  errorText: {
    color: "#C62828",
    marginBottom: 16,
    fontWeight: 600,
  },
  successText: {
    color: "#2E7D32",
    marginBottom: 16,
    fontWeight: 600,
  },
};