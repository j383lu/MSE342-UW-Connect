import React, { useEffect, useState, useContext } from "react";
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

  useEffect(() => {
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

  const handleEventTypeChange = async (type) => {
    setEventType(type);
    setError("");

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

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (
      !title ||
      !description ||
      !eventDate ||
      !eventTime ||
      !location ||
      !capacity ||
      !category
    ) {
      setError("Please fill in all fields.");
      return;
    }

    const capNum = Number(capacity);
    if (!Number.isInteger(capNum) || capNum <= 0) {
      setError("Capacity must be a positive integer.");
      return;
    }

    if (eventType === "group" && selectedGroups.length === 0) {
      setError("Please select at least one group for a group event.");
      return;
    }

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
          Authorization: token,
        },
        body: JSON.stringify({
          title,
          description,
          event_date: eventDate,
          event_time: eventTime,
          location,
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