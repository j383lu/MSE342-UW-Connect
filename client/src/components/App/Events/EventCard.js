import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  const [fieldErrors, setFieldErrors] = useState({});

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

  const editTitleRef = useRef(null);
  const editDescriptionRef = useRef(null);
  const editCategoryRef = useRef(null);
  const editGroupRef = useRef(null);
  const editStartDateRef = useRef(null);
  const editStartTimeRef = useRef(null);
  const editEndDateRef = useRef(null);
  const editEndTimeRef = useRef(null);
  const editLocationRef = useRef(null);
  const editCapacityRef = useRef(null);

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
      .filter((tag) => {
        if (!tag) return false;
        const lower = String(tag).toLowerCase();
        return !(lower === "__calendar__" || lower.startsWith("__cal"));
      });
  }, [ev.tags]);

  const visibleEventTags = useMemo(
    () =>
      eventTags.filter(
        (tag) => !String(tag).toLowerCase().startsWith("__cal")
      ),
    [eventTags]
  );

  const eventTypeRaw = String(ev.event_type || "public").toLowerCase();
  const eventTypeText =
    eventTypeRaw === "group" ? "Group" : eventTypeRaw === "private" ? "Private" : "Public";

  const privateInviteAttendeeCount =
    eventTypeRaw === "private"
      ? isOpen && !detailsLoading && Array.isArray(attendees)
        ? Math.max(attendees.length, current)
        : Number.isFinite(Number(ev.attendee_count)) && Number(ev.attendee_count) >= 0
          ? Number(ev.attendee_count)
          : current
      : 0;

  const privateInviteAttendeeLabel =
    eventTypeRaw === "private"
      ? privateInviteAttendeeCount === 1
        ? "1 attendee"
        : `${privateInviteAttendeeCount} attendees`
      : "";

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

  const editFieldRefs = {
    title: editTitleRef,
    description: editDescriptionRef,
    category: editCategoryRef,
    selectedGroups: editGroupRef,
    eventDate: editStartDateRef,
    eventTime: editStartTimeRef,
    endDate: editEndDateRef,
    endTime: editEndTimeRef,
    location: editLocationRef,
    capacity: editCapacityRef,
  };

  // This helper function scrolls to the first invalid input field in the edit form
  // So that user can locate and fix the first error when validation fails
  const scrollToEditField = (fieldName) => {
    const targetRef = editFieldRefs[fieldName];

    if (targetRef && targetRef.current) {
      targetRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      if (typeof targetRef.current.focus === "function") {
        setTimeout(() => {
          targetRef.current.focus();
        }, 250);
      }
    }
  };

  // Remove the error message of one specific edit field
  // Also update the error state so the field looks normal again after user edit it
  const clearEditFieldError = (fieldName) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  };

  // This function builds the selected group list from event
  // It converts stored group IDs and names into objects for UI display
  const buildSelectedGroupsFromEvent = useCallback(() => {
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
  }, [ev.group_ids, ev.group_names]);

  // This function resets all edit form fields to the original event values
  // It is used when entering edit mode or cancelling editing
  const resetEditForm = useCallback(() => {
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
      eventTypeRaw === "group" ? "group" : eventTypeRaw === "private" ? "private" : "public"
    );
    setGroupSelectValue("");
    setSelectedGroups(eventTypeRaw === "private" ? [] : buildSelectedGroupsFromEvent());
    setEditError("");
    setEditMessage("");
    setGroupMessage("");
    setFieldErrors({});
  }, [
    ev.title,
    ev.description,
    ev.event_date,
    ev.event_time,
    ev.end_date,
    ev.end_time,
    ev.location,
    ev.capacity,
    ev.category,
    eventTags,
    eventTypeRaw,
    buildSelectedGroupsFromEvent,
  ]);

  useEffect(() => {
    setLikes(Number(ev.likes || 0));
    setLiked(Number(ev.has_liked || 0) === 1);

    if (!isEditing) {
      resetEditForm();
    }
  }, [ev.likes, ev.has_liked, isEditing, resetEditForm]);

  // Get the firebase authentication token of the current user
  const getToken = async () => {
    const user = firebase?.auth?.currentUser;
    if (!user) {
      throw new Error("You must be logged in.");
    }

    return user.getIdToken();
  };

  // Load event categories from the backend and update the category dropdown options in the edit form
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

  // Load all groups that the current user has joined
  // It is used when creating or editing group events
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

  // Start the edit mode for the event and initialize form data and load categories or groups when user re-edit an event
  const startEditing = async () => {
    if (!isOwner) return;

    resetEditForm();
    setIsEditing(true);

    if (categories.length === 0) {
      await loadCategories();
    }

    if (eventTypeRaw === "group" && !groupsLoaded) {
      await loadMyGroups();
    }
  };

  // When user cancel re-editing, reset the form and back to view
  const cancelEditing = () => {
    resetEditForm();
    setIsEditing(false);
  };

  // The handleEditEventTypeChange function handles switching between event types of public, group, private
  // It also resets related fields and loads group data
  const handleEditEventTypeChange = async (type) => {
    setEventType(type);
    setEditError("");
    setEditMessage("");
    clearEditFieldError("selectedGroups");

    if (type === "public" || type === "private") {
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

  // Add a new tag to the event and prevent duplicate tags
  // Clear the input textbox after adding a tag
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

  // Remove a tag from the event and update the tag list
  const handleRemoveTag = (tagToRemove) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  // This function add a selected group to the event and ensure no duplicate groups are added
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
    clearEditFieldError("selectedGroups");
  };

  // Remove a group and update group list
  const handleRemoveGroup = (groupIdToRemove) => {
    setSelectedGroups((prev) =>
      prev.filter((group) => String(group.group_id) !== String(groupIdToRemove))
    );
  };

  // This function checks the start and end date/time validation
  // It ensures end time is always after start time
  // Check date first, then start time and end time
  const validateEventDateTime = () => {
    const errors = {};

    if (eventDate && endDate) {
      const startDateOnly = new Date(`${eventDate}T00:00`);
      const endDateOnly = new Date(`${endDate}T00:00`);

      if (
        Number.isNaN(startDateOnly.getTime()) ||
        Number.isNaN(endDateOnly.getTime())
      ) {
        errors.endDate = "Please enter valid start date and end date.";
        return errors;
      }

      if (endDateOnly < startDateOnly) {
        errors.endDate = "End date must be after or equal to start date.";
        return errors;
      }
    }

    if (eventDate && eventTime && endDate && endTime) {
      const startDateTime = new Date(`${eventDate}T${eventTime}`);
      const endDateTime = new Date(`${endDate}T${endTime}`);

      if (
        Number.isNaN(startDateTime.getTime()) ||
        Number.isNaN(endDateTime.getTime())
      ) {
        errors.endTime = "Please enter valid start time and end time.";
        return errors;
      }

      if (eventDate === endDate && endDateTime <= startDateTime) {
        errors.endTime = "End time must be after start time.";
        return errors;
      }

      if (endDateTime <= startDateTime) {
        errors.endDate =
          "End date and end time must be after start date and start time.";
        return errors;
      }
    }

    return errors;
  };

  // Validate all edit form fields and check required fields, capacity, and group selection
  const validateEditFields = () => {
    const errors = {};

    if (!title.trim()) {
      errors.title = "Event Title is empty, please enter event title.";
    }

    if (!description.trim()) {
      errors.description =
        "Description is empty, please enter event description.";
    }

    if (!category) {
      errors.category = "Category is empty, please select a category.";
    }

    if (!eventDate) {
      errors.eventDate = "Start Date is empty, please select start date.";
    }

    if (!eventTime) {
      errors.eventTime = "Start Time is empty, please select start time.";
    }

    if (!endDate) {
      errors.endDate = "End Date is empty, please select end date.";
    }

    if (!endTime) {
      errors.endTime = "End Time is empty, please select end time.";
    }

    if (!location.trim()) {
      errors.location = "Location is empty, please enter event location.";
    }

    if (capacity === "" || capacity === null) {
      errors.capacity =
        "Max RSVP Spots is empty, please enter the maximum RSVP spots.";
    } else {
      const capNum = Number(capacity);

      if (!Number.isInteger(capNum) || capNum < 2) {
        errors.capacity =
          "Max RSVP spots must be an integer greater than or equal to 2.";
      }
    }

    if (eventType === "group" && selectedGroups.length === 0) {
      errors.selectedGroups =
        "Please select at least one group for a group event.";
    }

    const dateTimeErrors = validateEventDateTime();
    return { ...errors, ...dateTimeErrors };
  };

  // Below are the main functions of EventCard.js

  // This function saves the updated event information
  // It validates inputs first, then sends the updated data to the backend
  const handleSaveChanges = async () => {
    setEditError("");
    setEditMessage("");

    const validationErrors = validateEditFields();

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);

      const firstErrorField = Object.keys(validationErrors)[0];
      scrollToEditField(firstErrorField);
      return;
    }

    setFieldErrors({});

    try {
      setSaveLoading(true);

      const success = await onUpdateEvent(ev.id, {
        title: title.trim(),
        description: description.trim(),
        event_date: eventDate,
        event_time: eventTime,
        end_date: endDate,
        end_time: endTime,
        location: location.trim(),
        capacity: Number(capacity),
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

  // This function handles deleting an event
  // It asks for user confirmation before calling the delete API
  const handleDeleteClick = async () => {
    if (!isOwner) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this event?"
    );

    if (!confirmed) return;

    await onDeleteEvent(ev);
  };

  // This handler function handles the user to like or unlike an event
  // Send a request to the backend and update the like state and like number
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
                {eventTypeRaw === "private"
                  ? privateInviteAttendeeCount
                  : `${current}/${max}`}
              </div>
              <div style={styles.capacityHint}>
                {eventTypeRaw === "private" ? "Attendees" : "RSVP spots"}
              </div>
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
                  ...(eventTypeRaw === "private"
                    ? {
                        background: "#FAF5FF",
                        color: "#553C9A",
                        border: "1px solid #D6BCFA",
                      }
                    : eventTypeRaw === "group"
                      ? {
                          background: "#F0FFF4",
                          color: "#276749",
                          border: "1px solid #9AE6B4",
                        }
                      : {}),
                }}
              >
                {eventTypeText}
              </span>
              {eventTypeRaw === "private" ? (
                <span style={{ ...styles.categoryChip, marginLeft: "8px" }}>
                  {privateInviteAttendeeLabel}
                </span>
              ) : null}
            </div>
          ) : null}

          {visibleEventTags.length > 0 ? (
            <div style={styles.tagsWrap}>
              {visibleEventTags.map((tag, index) => (
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
                ref={editTitleRef}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  clearEditFieldError("title");
                }}
                style={{
                  ...styles.formInput,
                  ...(fieldErrors.title ? styles.formInputError : {}),
                }}
              />
              {fieldErrors.title ? (
                <div style={styles.fieldErrorText}>{fieldErrors.title}</div>
              ) : null}
            </div>

            <div style={styles.formField}>
              <label style={styles.formLabel}>Description</label>
              <textarea
                ref={editDescriptionRef}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  clearEditFieldError("description");
                }}
                style={{
                  ...styles.formTextarea,
                  ...(fieldErrors.description ? styles.formInputError : {}),
                }}
                rows={5}
              />
              {fieldErrors.description ? (
                <div style={styles.fieldErrorText}>{fieldErrors.description}</div>
              ) : null}
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
                  Group
                </button>

                <button
                  type="button"
                  onClick={() => handleEditEventTypeChange("private")}
                  style={{
                    ...styles.filterChip,
                    ...(eventType === "private" ? styles.filterChipActive : {}),
                    cursor: "pointer",
                  }}
                >
                  Invite only
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
                        ref={editGroupRef}
                        value={groupSelectValue}
                        onChange={(e) => setGroupSelectValue(e.target.value)}
                        style={{
                          ...styles.formSelect,
                          ...(fieldErrors.selectedGroups
                            ? styles.formInputError
                            : {}),
                        }}
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

                    {fieldErrors.selectedGroups ? (
                      <div style={styles.fieldErrorText}>
                        {fieldErrors.selectedGroups}
                      </div>
                    ) : null}

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
                ref={editCategoryRef}
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  clearEditFieldError("category");
                }}
                style={{
                  ...styles.formSelect,
                  ...(fieldErrors.category ? styles.formInputError : {}),
                }}
              >
                <option value="">Select a category</option>
                {categories.map((item) => (
                  <option key={item.tag_name} value={item.tag_name}>
                    {item.tag_name}
                  </option>
                ))}
              </select>
              {fieldErrors.category ? (
                <div style={styles.fieldErrorText}>{fieldErrors.category}</div>
              ) : null}
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
                  ref={editStartDateRef}
                  type="date"
                  value={eventDate}
                  onChange={(e) => {
                    setEventDate(e.target.value);
                    clearEditFieldError("eventDate");
                  }}
                  style={{
                    ...styles.formInput,
                    ...(fieldErrors.eventDate ? styles.formInputError : {}),
                  }}
                />
                {fieldErrors.eventDate ? (
                  <div style={styles.fieldErrorText}>{fieldErrors.eventDate}</div>
                ) : null}
              </div>

              <div style={styles.formField}>
                <label style={styles.formLabel}>Start Time</label>
                <input
                  ref={editStartTimeRef}
                  type="time"
                  value={eventTime}
                  onChange={(e) => {
                    setEventTime(e.target.value);
                    clearEditFieldError("eventTime");
                  }}
                  style={{
                    ...styles.formInput,
                    ...(fieldErrors.eventTime ? styles.formInputError : {}),
                  }}
                />
                {fieldErrors.eventTime ? (
                  <div style={styles.fieldErrorText}>{fieldErrors.eventTime}</div>
                ) : null}
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={styles.formField}>
                <label style={styles.formLabel}>End Date</label>
                <input
                  ref={editEndDateRef}
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    clearEditFieldError("endDate");
                  }}
                  style={{
                    ...styles.formInput,
                    ...(fieldErrors.endDate ? styles.formInputError : {}),
                  }}
                />
                {fieldErrors.endDate ? (
                  <div style={styles.fieldErrorText}>{fieldErrors.endDate}</div>
                ) : null}
              </div>

              <div style={styles.formField}>
                <label style={styles.formLabel}>End Time</label>
                <input
                  ref={editEndTimeRef}
                  type="time"
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    clearEditFieldError("endTime");
                  }}
                  style={{
                    ...styles.formInput,
                    ...(fieldErrors.endTime ? styles.formInputError : {}),
                  }}
                />
                {fieldErrors.endTime ? (
                  <div style={styles.fieldErrorText}>{fieldErrors.endTime}</div>
                ) : null}
              </div>
            </div>

            <div style={styles.formField}>
              <label style={styles.formLabel}>Location</label>
              <input
                ref={editLocationRef}
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  clearEditFieldError("location");
                }}
                style={{
                  ...styles.formInput,
                  ...(fieldErrors.location ? styles.formInputError : {}),
                }}
              />
              {fieldErrors.location ? (
                <div style={styles.fieldErrorText}>{fieldErrors.location}</div>
              ) : null}
            </div>

            <div style={styles.formField}>
              <label style={styles.formLabel}>Max RSVP Spots</label>
              <input
                ref={editCapacityRef}
                type="number"
                min="2"
                value={capacity}
                onChange={(e) => {
                  setCapacity(e.target.value);
                  clearEditFieldError("capacity");
                }}
                style={{
                  ...styles.formInput,
                  ...(fieldErrors.capacity ? styles.formInputError : {}),
                }}
              />
              {fieldErrors.capacity ? (
                <div style={styles.fieldErrorText}>{fieldErrors.capacity}</div>
              ) : null}
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