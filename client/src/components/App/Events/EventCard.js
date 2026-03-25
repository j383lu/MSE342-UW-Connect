import React, { useContext, useEffect, useMemo, useState } from "react";
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
  onUpdateEvent,
  onDeleteEvent,
}) {
  const firebase = useContext(FirebaseContext);

  const [hover, setHover] = useState(false);
  const [likes, setLikes] = useState(Number(ev.likes || 0));
  const [liked, setLiked] = useState(Number(ev.has_liked || 0) === 1);
  const [likeLoading, setLikeLoading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editMessage, setEditMessage] = useState("");

  const [categories, setCategories] = useState([]);
  const [joinedGroups, setJoinedGroups] = useState([]);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupMessage, setGroupMessage] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [category, setCategory] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const [eventType, setEventType] = useState("public");
  const [groupSelectValue, setGroupSelectValue] = useState("");
  const [selectedGroups, setSelectedGroups] = useState([]);

  const current = Number(ev.current_count || 0);
  const max = Number(ev.capacity || 0);
  const isFull = max > 0 && current >= max;
  const hasJoined = Number(ev.has_joined || 0) === 1;
  const isOwner = Number(ev.is_owner || 0) === 1;

  const eventTags = useMemo(() => {
    if (!ev.tags) return [];
    return String(ev.tags)
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }, [ev.tags]);

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

  const buildSelectedGroupsFromEvent = () => {
    const ids = String(ev.group_ids || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const names = String(ev.group_names || "")
      .split(",")
      .map((item) => item.trim());

    return ids.map((id, index) => ({
      group_id: Number(id),
      name: names[index] || `Group ${id}`,
    }));
  };

  const resetEditForm = () => {
    setTitle(ev.title || "");
    setDescription(ev.description || "");
    setEventDate(ev.event_date || "");
    setEventTime(ev.event_time || "");
    setEndDate(ev.end_date || "");
    setEndTime(ev.end_time || "");
    setLocation(ev.location || "");
    setCapacity(String(ev.capacity || ""));
    setCategory(ev.category || "");
    setTagInput("");
    setTags(eventTags);
    setEventType(
      String(ev.event_type || "public").toLowerCase() === "group"
        ? "group"
        : "public"
    );
    setGroupSelectValue("");
    setSelectedGroups(buildSelectedGroupsFromEvent());
    setEditError("");
    setEditMessage("");
    setGroupMessage("");
  };

  useEffect(() => {
    setLikes(Number(ev.likes || 0));
    setLiked(Number(ev.has_liked || 0) === 1);

    if (!isEditing) {
      resetEditForm();
    }
  }, [ev, isEditing]);

  const getToken = async () => {
    const user = firebase?.auth?.currentUser;
    if (!user) {
      throw new Error("You must be logged in.");
    }

    return user.getIdToken();
  };

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();

      if (!res.ok) {
        return;
      }

      setCategories(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log("Failed to load categories.");
    }
  };

  const loadMyGroups = async () => {
    try {
      setGroupsLoading(true);
      setGroupMessage("");

      const token = await getToken();

      const res = await fetch("/api/my-groups", {
        method: "GET",
        headers: {
          Authorization: token,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setJoinedGroups([]);
        setGroupsLoaded(true);
        setGroupMessage(data.error || "Failed to load your groups.");
        return;
      }

      const groups = Array.isArray(data.groups) ? data.groups : [];
      setJoinedGroups(groups);
      setGroupsLoaded(true);

      if (groups.length === 0) {
        setGroupMessage("You are not currently in any groups.");
      }
    } catch (e) {
      setJoinedGroups([]);
      setGroupsLoaded(true);
      setGroupMessage("Failed to load your groups.");
    } finally {
      setGroupsLoading(false);
    }
  };

  const startEditing = async () => {
    if (!isOwner) return;

    resetEditForm();
    setIsEditing(true);

    if (categories.length === 0) {
      await loadCategories();
    }

    if (
      String(ev.event_type || "public").toLowerCase() === "group" &&
      !groupsLoaded
    ) {
      await loadMyGroups();
    }
  };

  const cancelEditing = () => {
    resetEditForm();
    setIsEditing(false);
  };

  const handleEditEventTypeChange = async (type) => {
    setEventType(type);
    setEditError("");
    setEditMessage("");

    if (type === "public") {
      setGroupSelectValue("");
      setSelectedGroups([]);
      setGroupMessage("");
      return;
    }

    if (type === "group" && !groupsLoaded) {
      await loadMyGroups();
    }

    if (type === "group" && groupsLoaded && joinedGroups.length === 0) {
      setGroupMessage("You are not currently in any groups.");
    }
  };

  const handleAddTag = () => {
    const cleanTag = tagInput.trim();

    if (!cleanTag) return;

    const alreadyExists = tags.some(
      (tag) => tag.toLowerCase() === cleanTag.toLowerCase()
    );

    if (alreadyExists) {
      setTagInput("");
      return;
    }

    setTags((prev) => [...prev, cleanTag]);
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  const handleAddGroup = () => {
    if (!groupSelectValue) return;

    const selectedGroup = joinedGroups.find(
      (group) => String(group.group_id) === String(groupSelectValue)
    );

    if (!selectedGroup) return;

    const alreadyExists = selectedGroups.some(
      (group) => String(group.group_id) === String(selectedGroup.group_id)
    );

    if (alreadyExists) {
      setGroupSelectValue("");
      return;
    }

    setSelectedGroups((prev) => [...prev, selectedGroup]);
    setGroupSelectValue("");
  };

  const handleRemoveGroup = (groupIdToRemove) => {
    setSelectedGroups((prev) =>
      prev.filter((group) => String(group.group_id) !== String(groupIdToRemove))
    );
  };

  const validateEventDateTime = () => {
    if (!eventDate || !eventTime || !endDate || !endTime) {
      return "Please fill in all start and end date and time fields.";
    }

    const startDateOnly = new Date(`${eventDate}T00:00`);
    const endDateOnly = new Date(`${endDate}T00:00`);

    if (
      Number.isNaN(startDateOnly.getTime()) ||
      Number.isNaN(endDateOnly.getTime())
    ) {
      return "Please enter valid start date and end date.";
    }

    if (endDateOnly < startDateOnly) {
      return "End date must be after or equal to start date.";
    }

    const startDateTime = new Date(`${eventDate}T${eventTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);

    if (
      Number.isNaN(startDateTime.getTime()) ||
      Number.isNaN(endDateTime.getTime())
    ) {
      return "Please enter valid start time and end time.";
    }

    if (eventDate === endDate && endDateTime <= startDateTime) {
      return "End time must be after start time.";
    }

    if (endDateTime <= startDateTime) {
      return "End date and end time must be after start date and start time.";
    }

    return "";
  };

  const handleSaveChanges = async () => {
    setEditError("");
    setEditMessage("");

    if (!title || !description || !eventDate || !eventTime || !endDate || !endTime || !location || !capacity || !category) {
      setEditError("Please fill in all fields.");
      return;
    }

    const dateTimeError = validateEventDateTime();
    if (dateTimeError) {
      setEditError(dateTimeError);
      return;
    }

    const capNum = Number(capacity);
    if (!Number.isInteger(capNum) || capNum < 2) {
      setEditError("Max RSVP spots must be an integer greater than or equal to 2.");
      return;
    }

    if (eventType === "group" && selectedGroups.length === 0) {
      setEditError("Please select at least one group for a group event.");
      return;
    }

    try {
      setSaveLoading(true);

      const success = await onUpdateEvent(ev.id, {
        title,
        description,
        event_date: eventDate,
        event_time: eventTime,
        end_date: endDate,
        end_time: endTime,
        location,
        capacity: capNum,
        category,
        tags,
        event_type: eventType,
        group_ids: selectedGroups.map((group) => group.group_id),
      });

      if (success) {
        setEditMessage("Event updated successfully.");
        setIsEditing(false);
      }
    } catch (e) {
      setEditError("Failed to update event.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!isOwner) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this event?"
    );

    if (!confirmed) return;

    await onDeleteEvent(ev);
  };

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
        ...(hover && !isEditing ? styles.cardHover : null),
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {!isEditing ? (
        <>
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
              <div
                style={{
                  ...styles.statusPill,
                  ...statusStyle,
                  marginBottom: "12px",
                }}
              >
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

          <div style={styles.cardBottomRow}>
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

            {isOwner ? (
              <div style={styles.ownerActions}>
                <button
                  type="button"
                  style={styles.ownerDeleteBtn}
                  onClick={handleDeleteClick}
                >
                  Delete This Event
                </button>

                <button
                  type="button"
                  style={styles.ownerEditBtn}
                  onClick={startEditing}
                >
                  Re-edit Event
                </button>
              </div>
            ) : null}
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
        </>
      ) : (
        <>
          <div style={styles.editTitleRow}>
            <div style={styles.title}>Edit Event</div>

            <div style={styles.rightBox}>
              <div
                style={{
                  ...styles.statusPill,
                  ...statusStyle,
                }}
              >
                {statusText}
              </div>
            </div>
          </div>

          {editError ? <div style={styles.errorBanner}>{editError}</div> : null}
          {editMessage ? <div style={styles.inlineSuccess}>{editMessage}</div> : null}

          <div style={styles.form}>
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

            <div style={styles.formField}>
              <label style={styles.formLabel}>Event Type</label>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginTop: "8px",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleEditEventTypeChange("public")}
                  style={{
                    ...styles.filterChip,
                    ...(eventType === "public" ? styles.filterChipActive : {}),
                    cursor: "pointer",
                  }}
                >
                  Public
                </button>

                <button
                  type="button"
                  onClick={() => handleEditEventTypeChange("group")}
                  style={{
                    ...styles.filterChip,
                    ...(eventType === "group" ? styles.filterChipActive : {}),
                    cursor: "pointer",
                  }}
                >
                  Private
                </button>
              </div>
            </div>

            {eventType === "group" ? (
              <div style={styles.formField}>
                <label style={styles.formLabel}>Select Group</label>

                {groupsLoading ? (
                  <div style={styles.infoText}>Loading your groups...</div>
                ) : joinedGroups.length === 0 ? (
                  <div style={styles.infoText}>
                    {groupMessage || "You are not currently in any groups."}
                  </div>
                ) : (
                  <>
                    <div style={styles.tagInputRow}>
                      <select
                        value={groupSelectValue}
                        onChange={(e) => setGroupSelectValue(e.target.value)}
                        style={styles.formSelect}
                      >
                        <option value="">Select a group</option>
                        {joinedGroups.map((group) => (
                          <option key={group.group_id} value={group.group_id}>
                            {group.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        style={styles.addTagBtn}
                        onClick={handleAddGroup}
                      >
                        Add Group
                      </button>
                    </div>

                    {selectedGroups.length > 0 ? (
                      <div style={styles.tagsWrap}>
                        {selectedGroups.map((group) => (
                          <div key={group.group_id} style={styles.tagChip}>
                            <span style={styles.tagChipText}>{group.name}</span>

                            <button
                              type="button"
                              style={styles.tagRemoveBtn}
                              onClick={() => handleRemoveGroup(group.group_id)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}

            <div style={styles.formField}>
              <label style={styles.formLabel}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={styles.formSelect}
              >
                <option value="">Select a category</option>
                {categories.map((item) => (
                  <option key={item.tag_name} value={item.tag_name}>
                    {item.tag_name}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formField}>
              <label style={styles.formLabel}>Tags</label>

              <div style={styles.tagInputRow}>
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  style={styles.formInput}
                  placeholder="Enter a tag"
                />

                <button
                  type="button"
                  style={styles.addTagBtn}
                  onClick={handleAddTag}
                >
                  Add Tag
                </button>
              </div>

              {tags.length > 0 ? (
                <div style={styles.tagsWrap}>
                  {tags.map((tag, index) => (
                    <div key={`${tag}-${index}`} style={styles.tagChip}>
                      <span style={styles.tagChipText}>{tag}</span>

                      <button
                        type="button"
                        style={styles.tagRemoveBtn}
                        onClick={() => handleRemoveTag(tag)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div style={styles.formRow}>
              <div style={styles.formField}>
                <label style={styles.formLabel}>Start Date</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              <div style={styles.formField}>
                <label style={styles.formLabel}>Start Time</label>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  style={styles.formInput}
                />
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={styles.formField}>
                <label style={styles.formLabel}>End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              <div style={styles.formField}>
                <label style={styles.formLabel}>End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
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
                min="2"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                style={styles.formInput}
              />
            </div>
          </div>

          <div style={styles.cardBottomRow}>
            <div style={styles.actions}>
              <button
                type="button"
                style={{
                  ...styles.submitBtn,
                  ...(saveLoading ? styles.joinBtnDisabled : {}),
                }}
                onClick={handleSaveChanges}
                disabled={saveLoading}
              >
                {saveLoading ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                style={styles.cancelBtn}
                onClick={cancelEditing}
              >
                Cancel Edit
              </button>
            </div>

            <div style={styles.ownerActions}>
              <button
                type="button"
                style={styles.ownerDeleteBtn}
                onClick={handleDeleteClick}
              >
                Delete This Event
              </button>
            </div>
          </div>

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
        </>
      )}
    </div>
  );
}