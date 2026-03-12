import React, { useEffect, useState } from "react";
import styles from "./eventStyles";

// Sprint 2 limitation:
// Likes are currently stored only as a total count. User authentication is not implemented yet,
// so the system cannot prevent multiple likes from the same user.
// This will be improved once the login system is implemented.

export default function EventCard({
  ev,
  isPast,
  isOpen,
  attendees,
  detailsLoading,
  detailsError,
  toggleAttendees,
  handleJoin,
  onLikeSuccess,
}) {
  const [hover, setHover] = useState(false);
  const [likes, setLikes] = useState(Number(ev.likes || 0));
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  useEffect(() => {
    setLikes(Number(ev.likes || 0));
  }, [ev.likes]);

  const current = Number(ev.current_count || 0);
  const max = Number(ev.capacity || 0);
  const isFull = max > 0 && current >= max;

  const statusStyle = isPast
    ? styles.statusEnded
    : isFull
    ? styles.statusFull
    : styles.statusOpen;

  const statusText = isPast ? "Ended" : isFull ? "Full" : "Open";
  const eventTags = ev.tags ? ev.tags.split(",") : [];

  const handleLike = async () => {
    if (likeLoading || liked) return;

    try {
      setLikeLoading(true);

      const res = await fetch(`/api/events/${ev.id}/like`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        window.alert(data.error || "Failed to like event.");
        return;
      }

      setLikes(Number(data.likes || 0));
      setLiked(true);

      if (onLikeSuccess) {
        onLikeSuccess();
      }
    } catch (e) {
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

            <div style={styles.metaLine}>
              <span style={styles.metaLabel}>Published</span>
              <span style={styles.metaValue}>{ev.published_time || "N/A"}</span>
            </div>
          </div>
        </div>

        <div style={styles.rightBox}>
          <div style={styles.capacity}>{current}/{max}</div>
          <div style={styles.capacityHint}>RSVP spots</div>

          <div style={{ ...styles.statusPill, ...statusStyle }}>
            {statusText}
          </div>
        </div>
      </div>

      {ev.category ? (
        <div style={styles.categoryRow}>
          <span style={styles.categoryLabel}>Category</span>
          <span style={styles.categoryChip}>{ev.category}</span>
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
          style={{
            ...styles.likeBtn,
            ...(liked ? styles.likeBtnActive : null),
            ...(likeLoading ? styles.joinBtnDisabled : null),
          }}
          onClick={handleLike}
          disabled={likeLoading || liked}
        >
          {liked ? "❤ Liked" : "♡ Like"}
        </button>

        <span style={styles.likeCount}>{likes} Likes</span>
      </div>

      <div style={styles.actions}>
        <button
          style={{
            ...styles.joinBtn,
            ...(isFull || isPast ? styles.joinBtnDisabled : null),
          }}
          disabled={isFull || isPast}
          onClick={() => handleJoin(ev)}
        >
          Join Event
        </button>

        <button
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