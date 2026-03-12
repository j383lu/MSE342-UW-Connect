import React from "react";
import styles from "./eventStyles";

export default function EventCard({
  ev,
  isPast,
  isOpen,
  attendees,
  detailsLoading,
  detailsError,
  toggleAttendees,
  handleJoin,
}) {
  const current = Number(ev.current_count || 0);
  const max = Number(ev.capacity || 0);
  const isFull = max > 0 && current >= max;

  return (
    <div style={{ ...styles.card, ...(isPast ? styles.cardPast : null) }}>
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
            {isPast ? "Ended" : isFull ? "Full" : "Spots"}
          </div>
        </div>
      </div>

      <div style={styles.desc}>{ev.description}</div>

      <div style={styles.actions}>
        <button
          style={{
            ...styles.joinBtn,
            ...(isFull || isPast ? styles.joinBtnDisabled : null),
          }}
          disabled={isFull || isPast}
          onClick={() => handleJoin(ev)}
        >
          Join Now
        </button>

        <button style={styles.detailsBtn} onClick={() => toggleAttendees(ev.id)}>
          {isOpen ? "Hide Attendees" : "Show Attendees"}
        </button>
      </div>

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
}