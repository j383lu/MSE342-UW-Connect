import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./eventStyles";

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

      setMessage("Event created successfully.");
      setTimeout(() => navigate("/events"), 700);
    } catch (e2) {
      setError("Cannot connect to backend.");
    }
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
              <h1 style={styles.heroTitle}>Create a New Event</h1>
              <p style={styles.heroSubtitle}>
                Plan an activity, share the details, and invite people to join your next campus event.
              </p>
            </div>

            <div style={styles.heroActionRow}>
              <button
                type="button"
                style={styles.heroSecondaryBtn}
                onClick={() => navigate("/events")}
              >
                Back to Events
              </button>
            </div>
          </div>
        </div>

        {error ? <div style={styles.errorBanner}>{error}</div> : null}
        {message ? <div style={styles.summaryCard}>{message}</div> : null}

        <div style={styles.panel}>
          <div style={styles.sectionHeaderBlock}>
            <h2 style={styles.panelTitle}>Event Information</h2>
            <p style={styles.panelSubtitle}>
              Fill in the details below to publish a new event for students to discover and join.
            </p>
          </div>

          <form onSubmit={handleCreate} style={styles.form}>
            <div style={styles.formField}>
              <label style={styles.formLabel}>Event Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={styles.formInput}
              />
            </div>

            <div style={styles.formField}>
              <label style={styles.formLabel}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={styles.formTextarea}
                rows={5}
              />
            </div>

            <div style={styles.formRow}>
              <div style={styles.formField}>
                <label style={styles.formLabel}>Date</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              <div style={styles.formField}>
                <label style={styles.formLabel}>Time</label>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  style={styles.formInput}
                />
              </div>
            </div>

            <div style={styles.formField}>
              <label style={styles.formLabel}>Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={styles.formInput}
              />
            </div>

            <div style={styles.formField}>
              <label style={styles.formLabel}>Max RSVP Spots</label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                style={styles.formInput}
              />
            </div>

            <div style={styles.formActions}>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={() => navigate("/events")}
              >
                Cancel
              </button>

              <button type="submit" style={styles.submitBtn}>
                Create Event
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}