import React, { useEffect, useState, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./eventStyles";
import { FirebaseContext } from "../../Firebase";

export default function CreateEventForm() {
  const navigate = useNavigate();
  const firebase = useContext(FirebaseContext);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");

  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");

  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);

  const [eventType, setEventType] = useState("public");
  const [joinedGroups, setJoinedGroups] = useState([]);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupSelectValue, setGroupSelectValue] = useState("");
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [groupMessage, setGroupMessage] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const titleRef = useRef(null);
  const descriptionRef = useRef(null);
  const categoryRef = useRef(null);
  const groupRef = useRef(null);
  const eventDateRef = useRef(null);
  const eventTimeRef = useRef(null);
  const endDateRef = useRef(null);
  const endTimeRef = useRef(null);
  const locationRef = useRef(null);
  const capacityRef = useRef(null);

  const fieldRefs = {
    title: titleRef,
    description: descriptionRef,
    category: categoryRef,
    selectedGroups: groupRef,
    eventDate: eventDateRef,
    eventTime: eventTimeRef,
    endDate: endDateRef,
    endTime: endTimeRef,
    location: locationRef,
    capacity: capacityRef,
  };

  // This helper function scrolls the page to the first invalid field after validation fails
  const scrollToField = (fieldName) => {
    const targetRef = fieldRefs[fieldName];

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

  // This helper function removes the error message of one specific field after user changes it
  const clearFieldError = (fieldName) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  };

  // This hook runs once when the page loads and fetches category data from the server
  useEffect(() => {
    // The loadCategories function loads event categories from the backend when the page first opens
    const loadCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();

        if (!res.ok) {
          console.log(data.error || "Failed to load categories.");
          return;
        }

        setCategories(Array.isArray(data) ? data : []);
      } catch (e) {
        console.log("Failed to load categories.");
      }
    };

    loadCategories();
  }, []);

  // This function loads the groups that user has joined so they can create group events
  const loadMyGroups = async () => {
    try {
      setGroupsLoading(true);
      setGroupMessage("");

      const user = firebase.auth.currentUser;
      if (!user) {
        setGroupMessage("You must be logged in to load your groups.");
        setJoinedGroups([]);
        setGroupsLoaded(true);
        return;
      }

      const token = await user.getIdToken();

      const res = await fetch("/api/my-groups", {
        method: "GET",
        headers: {
          Authorization: token,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setGroupMessage(data.error || "Failed to load your groups.");
        setJoinedGroups([]);
        setGroupsLoaded(true);
        return;
      }

      const groups = Array.isArray(data.groups) ? data.groups : [];
      setJoinedGroups(groups);
      setGroupsLoaded(true);

      if (groups.length === 0) {
        setGroupMessage("You are not currently in any groups.");
      }
    } catch (e) {
      setGroupMessage("Failed to load your groups.");
      setJoinedGroups([]);
      setGroupsLoaded(true);
    } finally {
      setGroupsLoading(false);
    }
  };

  // This function changes between public and private event types and loads group data
  const handleEventTypeChange = async (type) => {
    setEventType(type);
    setError("");
    clearFieldError("selectedGroups");

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

  // This handler function adds a new tag to the event if it is not empty or already added
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

  // This handler function removes a selected tag from the tag list
  const handleRemoveTag = (tagToRemove) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  // This handler function adds a selected group to the event
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
    clearFieldError("selectedGroups");
  };

  // This handler function removes a selected group from the group list
  const handleRemoveGroup = (groupIdToRemove) => {
    setSelectedGroups((prev) =>
      prev.filter((group) => String(group.group_id) !== String(groupIdToRemove))
    );
  };

  // This function checks whether end date and end time are valid compared to start date and start time
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

  // This function checks every field and returns field level error messages
  const validateFields = () => {
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

  // Check the input fields and send request to the backend and create a new event
  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const validationErrors = validateFields();

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);

      const firstErrorField = Object.keys(validationErrors)[0];
      scrollToField(firstErrorField);
      return;
    }

    setFieldErrors({});

    try {
      const user = firebase.auth.currentUser;
      if (!user) {
        setError("You must be logged in to create an event.");
        return;
      }

      const token = await user.getIdToken();
      const capNum = Number(capacity);

      const res = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          event_date: eventDate,
          event_time: eventTime,
          end_date: endDate,
          end_time: endTime,
          location: location.trim(),
          capacity: capNum,
          category,
          tags,
          event_type: eventType,
          group_ids: selectedGroups.map((group) => group.group_id),
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
                ref={titleRef}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  clearFieldError("title");
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
                ref={descriptionRef}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  clearFieldError("description");
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
                  onClick={() => handleEventTypeChange("public")}
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
                  onClick={() => handleEventTypeChange("group")}
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
                        ref={groupRef}
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
                ref={categoryRef}
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  clearFieldError("category");
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
                    <div key={index} style={styles.tagChip}>
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
                  ref={eventDateRef}
                  type="date"
                  value={eventDate}
                  onChange={(e) => {
                    setEventDate(e.target.value);
                    clearFieldError("eventDate");
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
                  ref={eventTimeRef}
                  type="time"
                  value={eventTime}
                  onChange={(e) => {
                    setEventTime(e.target.value);
                    clearFieldError("eventTime");
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
                  ref={endDateRef}
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    clearFieldError("endDate");
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
                  ref={endTimeRef}
                  type="time"
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    clearFieldError("endTime");
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
                ref={locationRef}
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  clearFieldError("location");
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
                ref={capacityRef}
                type="number"
                min="2"
                value={capacity}
                onChange={(e) => {
                  setCapacity(e.target.value);
                  clearFieldError("capacity");
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