import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { FirebaseContext } from '../../Firebase';

export default function CreateEventForm() {
  const navigate = useNavigate();
  const firebase = useContext(FirebaseContext);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Use a handler function to handle form submit
  // Validate inputs, call backend, and redirect
  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    
    // Check if user enter all the fields
    // If not, throws an error message
    if (!title || !description || !eventDate || !eventTime || !location || !capacity) {
      setError("Please fill in all fields.");
      return;
    }
    
    // Check for event capacity validation, it must be a positive integer
    // If not, throws an error message
    const capNum = Number(capacity);
    if (!Number.isInteger(capNum) || capNum <= 0) {
      setError("Capacity must be a positive integer.");
      return;
    }

    // Create event in MySQL with POST /api/events
    try {
      const user = firebase.auth.currentUser;
      if (!user) {
        setError("You must be logged in to create an event.");
        return;
      }
      const token = await user.getIdToken();

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "Authorization": token 
        },
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

      // Handle backend errors (e.g., validation failed, DB error)
      if (!res.ok) {
        setError(data.error || "Failed to create event.");
        return;
      }

      // Show a message if an event is created successfully
      setMessage("Event created!");
      setTimeout(() => navigate("/events"), 600);
    } catch (e2) {
      // Handle network/backend error
      setError("Cannot connect to backend.");
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={{ margin: 0 }}>Create Event</h2>
          <p style={{ marginTop: 6, color: "#555" }}>Create an event post with max RSVP capacity.</p>
        </div>
        
        <button type="button" style={styles.outlineButton} onClick={() => navigate("/events")}>
          Back
        </button>
      </div>

      {error ? <div style={{ color: "red", marginBottom: 10 }}>{error}</div> : null}
      {message ? <div style={{ color: "green", marginBottom: 10 }}>{message}</div> : null}

      <div style={styles.card}>
        <form onSubmit={handleCreate} style={styles.form}>
          <label style={styles.label}>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={styles.input} />
          </label>

          <label style={styles.label}>
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={styles.textarea}
              rows={4}
            />
          </label>

          <div style={styles.row}>
            <label style={styles.label}>
              Date
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} style={styles.input} />
            </label>

            <label style={styles.label}>
              Time
              <input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} style={styles.input} />
            </label>
          </div>

          <label style={styles.label}>
            Location
            <input value={location} onChange={(e) => setLocation(e.target.value)} style={styles.input} />
          </label>

          <label style={styles.label}>
            Max RSVP Spots
            <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} style={styles.input} />
          </label>

          <button type="submit" style={styles.button}>
            Create
          </button>
        </form>
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
  card: {
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: 12,
    background: "white",
    maxWidth: 650,
  },
  form: { display: "flex", flexDirection: "column", gap: 10 },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13 },
  input: { width: "100%", height: 36, padding: "0 10px", border: "1px solid #ccc", borderRadius: 6 },
  textarea: { width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 6 },
  button: { height: 38, borderRadius: 6, border: "none", background: "black", color: "white", fontWeight: "bold", cursor: "pointer", marginTop: 6 },
  outlineButton: { height: 38, borderRadius: 6, border: "1px solid #aaa", background: "white", color: "#111", fontWeight: "bold", cursor: "pointer", padding: "0 14px" },
};