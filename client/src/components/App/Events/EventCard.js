import React, { useContext, useEffect, useState } from "react";
import styles from "./eventStyles";
import { FirebaseContext } from "../../Firebase";

export default function EventCard({
  ev,
  isPast,
  isOpen,
  attendees,
  detailsLoading,
  detailsError,
  toggleAttendees,
  handleJoin,
  handleLeave,
  onLikeSuccess,
}) {
  const firebase = useContext(FirebaseContext);

  const [hover, setHover] = useState(false);
  const [likes, setLikes] = useState(Number(ev.likes || 0));
  const [liked, setLiked] = useState(Number(ev.has_liked || 0) === 1);
  const [likeLoading, setLikeLoading] = useState(false);

  // This hook updates the like data when the event props change
  useEffect(() => {
    setLikes(Number(ev.likes || 0));
    setLiked(Number(ev.has_liked || 0) === 1);
  }, [ev.likes, ev.has_liked]);

  const current = Number(ev.current_count || 0);
  const max = Number(ev.capacity || 0);
  const isFull = max > 0 && current >= max;
  const hasJoined = Number(ev.has_joined || 0) === 1;

  const eventTags = ev.tags ? ev.tags.split(",") : [];

  const eventTypeText =
    String(ev.event_type || "public").toLowerCase() === "group"
      ? "Group"
      : "Public";

  const backendStatus =
    ev.event_status || (isPast ? "ended" : "open_for_application");

  let statusText = "";
  let statusStyle = {};

  if (backendStatus === "ended") {
    statusText = "Event has Ended";
    statusStyle = styles.statusEnded;
  } else if (isFull) {
    statusText = "Full";
    statusStyle = styles.statusFull;
  } else if (backendStatus === "in_progress") {
    statusText = "In Progress";
    statusStyle = styles.statusInProgress;
  } else {
    statusText = "Open For Application";
    statusStyle = styles.statusOpenForApplication;
  }

  const disableJoin = backendStatus === "ended" || isFull;

  // This handler function allows the user to like or unlike an event and update the result
  const handleLikeToggle = async (e) => {
    e.preventDefault();

    if (likeLoading) return;

    try {
      const user = firebase?.auth?.currentUser;
      if (!user) {
        window.alert("Please log in to like events.");
        return;
      }

      setLikeLoading(true);

      const token = await user.getIdToken();

      const res = await fetch(`/api/events/${ev.id}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        window.alert(data.error || "Failed to update like.");
        return;
      }

      const updatedLikes = Number(data.likes || 0);
      const updatedHasLiked = Number(data.has_liked || 0) === 1;

      setLikes(updatedLikes);
      setLiked(updatedHasLiked);

      if (data.message) {
        window.alert(data.message);
      }

      if (onLikeSuccess) {
        await onLikeSuccess(ev.id, updatedLikes, updatedHasLiked);
      }
    } catch (e2) {
      window.alert("Cannot connect to backend.");
    } finally {
      setLikeLoading(false);
    }
  };

  return (
    <div
      style={{
        ...styles.card,
        ...(isPast ? styles.cardPast : null),
        ...(hover ? styles.cardHover : null),
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={styles.cardTop}>
        <div style={styles.cardLeft}>
          <div style={styles.title}>{ev.title}</div>

          <div style={styles.metaBlock}>
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
              <div
                style={{
                  ...styles.metaLine,
                  flex: "1 1 220px",
                  minWidth: "220px",
                }}
              >
                <span style={styles.metaLabel}>Start Date</span>
                <span style={styles.metaValue}>{ev.event_date}</span>
              </div>

              <div
                style={{
                  ...styles.metaLine,
                  flex: "1 1 220px",
                  minWidth: "220px",
                }}
              >
                <span style={styles.metaLabel}>Start Time</span>
                <span style={styles.metaValue}>{ev.event_time}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
              <div
                style={{
                  ...styles.metaLine,
                  flex: "1 1 220px",
                  minWidth: "220px",
                }}
              >
                <span style={styles.metaLabel}>End Date</span>
                <span style={styles.metaValue}>{ev.end_date || "N/A"}</span>
              </div>

              <div
                style={{
                  ...styles.metaLine,
                  flex: "1 1 220px",
                  minWidth: "220px",
                }}
              >
                <span style={styles.metaLabel}>End Time</span>
                <span style={styles.metaValue}>{ev.end_time || "N/A"}</span>
              </div>
            </div>

            <div style={styles.metaLine}>
              <span style={styles.metaLabel}>Location</span>
              <span style={styles.metaValue}>{ev.location}</span>
            </div>

            <div style={styles.metaLine}>
              <span style={styles.metaLabel}>Published</span>
              <span style={styles.metaValue}>{ev.published_time || "N/A"}</span>
            </div>
          </div>
        </div>

        <div style={styles.rightBox}>
          <div style={{ ...styles.statusPill, ...statusStyle, marginBottom: "12px" }}>
            {statusText}
          </div>

          <div style={styles.capacity}>
            {current}/{max}
          </div>
          <div style={styles.capacityHint}>RSVP spots</div>
        </div>
      </div>

      {ev.category || ev.event_type ? (
        <div style={styles.categoryRow}>
          {ev.category ? (
            <>
              <span style={styles.categoryLabel}>Category</span>
              <span style={styles.categoryChip}>{ev.category}</span>
            </>
          ) : null}

          <span
            style={{
              ...styles.eventTypeChip,
              marginLeft: ev.category ? "8px" : "0",
            }}
          >
            {eventTypeText}
          </span>
        </div>
      ) : null}

      {eventTags.length > 0 ? (
        <div style={styles.tagsWrap}>
          {eventTags.map((tag, index) => (
            <div key={index} style={styles.tagChip}>
              <span style={styles.tagChipText}>{tag}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div style={styles.desc}>{ev.description}</div>

      <div style={styles.likesRow}>
        <button
          type="button"
          style={{
            ...styles.likeBtn,
            ...(liked ? styles.likeBtnActive : null),
            ...(likeLoading ? styles.joinBtnDisabled : null),
          }}
          onClick={handleLikeToggle}
          disabled={likeLoading}
        >
          {liked ? "❤ Liked" : "♡ Like"}
        </button>

        <span style={styles.likeCount}>{likes} Likes</span>
      </div>

      <div style={styles.actions}>
        {hasJoined ? (
          <button
            type="button"
            style={{
              ...styles.leaveBtn,
              ...(backendStatus === "ended" ? styles.joinBtnDisabled : null),
            }}
            onClick={() => handleLeave(ev)}
            disabled={backendStatus === "ended"}
          >
            Leave Event
          </button>
        ) : (
          <button
            type="button"
            style={{
              ...styles.joinBtn,
              ...(disableJoin ? styles.joinBtnDisabled : null),
            }}
            disabled={disableJoin}
            onClick={() => handleJoin(ev)}
          >
            Join Event
          </button>
        )}

        <button
          type="button"
          style={styles.detailsBtn}
          onClick={() => toggleAttendees(ev.id)}
        >
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
              <div style={styles.infoText}>Loading attendees...</div>
            ) : attendees.length === 0 ? (
              <div style={styles.infoText}>No one has joined yet.</div>
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