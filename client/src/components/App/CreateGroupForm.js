// client/src/components/App/CreateGroupForm.js

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createGroup, initStore } from "./GroupsTemporaryStore";

const CATEGORIES = ["Academic", "Intramural", "Social"];
const TAG_OPTIONS = ["Academic", "Intramural", "Social"];
const MAX_TAGS = 5;

export default function CreateGroupForm() {
  const navigate = useNavigate();

  const [coverFileName, setCoverFileName] = useState(""); // UI only for now

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [privacy, setPrivacy] = useState(""); // "public" | "private"
  const [tagSelect, setTagSelect] = useState("");
  const [tags, setTags] = useState([]);
  const [maxMembers, setMaxMembers] = useState("");

  const [touched, setTouched] = useState({
    name: false,
    description: false,
    category: false,
    privacy: false,
    tags: false,
  });

  useEffect(() => {
    initStore();
  }, []);

  function addTag() {
    setTouched((t) => ({ ...t, tags: true }));

    if (!tagSelect) return;
    if (tags.includes(tagSelect)) return;
    if (tags.length >= MAX_TAGS) return;

    setTags((prev) => [...prev, tagSelect]);
    setTagSelect("");
  }

  function removeTag(tag) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  const errors = useMemo(() => {
    const e = {};
    if (!name.trim()) e.name = "Group name is required";
    if (!description.trim()) e.description = "Description is required";
    if (!category) e.category = "Please select a category";
    if (!privacy) e.privacy = "Please select a privacy option";
    if (tags.length === 0) e.tags = "Please select at least one tag";
    return e;
  }, [name, description, category, privacy, tags]);

  const completion = useMemo(() => {
    // Name, Description, Category, Privacy, Tags (>=1) => 5 items
    let done = 0;
    if (name.trim()) done++;
    if (description.trim()) done++;
    if (category) done++;
    if (privacy) done++;
    if (tags.length > 0) done++;
    return Math.round((done / 5) * 100);
  }, [name, description, category, privacy, tags]);

  const canSubmit = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  function onSubmit(e) {
    e.preventDefault();

    setTouched({
      name: true,
      description: true,
      category: true,
      privacy: true,
      tags: true,
    });

    if (!canSubmit) return;

    // For now: store only what our GroupsTemporaryStore expects.
    // You can extend store later with privacy/tags/maxMembers/image if you want.
    const newGroup = createGroup({
      name: name.trim(),
      description: description.trim(),
      category,
      isOpen: privacy === "public",
    });

    navigate(`/groups/${newGroup.id}`);
  }

  return (
    <div style={page}>
      <div style={container}>
        <div style={card}>
          {/* Header */}
          <div style={cardHeader}>
            <h2 style={{ margin: 0, fontSize: 24 }}>Create New Group</h2>
            <button
              type="button"
              aria-label="Close"
              onClick={() => navigate("/groups")}
              style={closeBtn}
              title="Back to Groups"
            >
              ×
            </button>
          </div>

          <form onSubmit={onSubmit}>
            {/* Body */}
            <div style={cardBody}>
              {/* Cover image (UI only) */}
              <div style={formGroup}>
                <label style={label}>Group Cover Image</label>

                <label style={imageUpload}>
                  <div style={{ fontSize: 34, marginBottom: 8 }}>📷</div>
                  <div style={{ fontWeight: 600 }}>
                    {coverFileName ? coverFileName : "Click to upload (UI only)"}
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                    PNG, JPG, GIF up to 10MB
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setCoverFileName(f ? f.name : "");
                    }}
                  />
                </label>
              </div>

              {/* Name */}
              <div style={formGroup}>
                <label style={label}>Group Name *</label>
                <input
                  style={input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                  placeholder="e.g., Study Group 2024"
                />
                {touched.name && errors.name ? (
                  <div style={errorText}>{errors.name}</div>
                ) : null}
              </div>

              {/* Description */}
              <div style={formGroup}>
                <label style={label}>Description *</label>
                <textarea
                  style={{ ...input, minHeight: 100, resize: "vertical" }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, description: true }))}
                  placeholder="Describe your group's purpose, goals, and who should join..."
                />
                {touched.description && errors.description ? (
                  <div style={errorText}>{errors.description}</div>
                ) : null}
              </div>

              {/* Category + Privacy row */}
              <div style={formRow}>
                <div style={formGroup}>
                  <label style={label}>Category *</label>
                  <select
                    style={input}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, category: true }))}
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {touched.category && errors.category ? (
                    <div style={errorText}>{errors.category}</div>
                  ) : null}
                </div>

                <div style={formGroup}>
                  <label style={label}>Privacy *</label>
                  <div style={privacyOptions}>
                    <label style={privacyOption}>
                      <input
                        type="radio"
                        name="privacy"
                        value="public"
                        checked={privacy === "public"}
                        onChange={(e) => setPrivacy(e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, privacy: true }))}
                      />
                      Public
                    </label>

                    <label style={privacyOption}>
                      <input
                        type="radio"
                        name="privacy"
                        value="private"
                        checked={privacy === "private"}
                        onChange={(e) => setPrivacy(e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, privacy: true }))}
                      />
                      Private
                    </label>
                  </div>
                  {touched.privacy && errors.privacy ? (
                    <div style={errorText}>{errors.privacy}</div>
                  ) : null}
                </div>
              </div>

              {/* Tags */}
              <div style={formGroup}>
                <label style={label}>Group Tags (Select up to 5 tags) *</label>

                <div style={tagsContainer}>
                  <div style={tagDropdown}>
                    <select
                      style={{ ...input, marginBottom: 0 }}
                      value={tagSelect}
                      onChange={(e) => setTagSelect(e.target.value)}
                    >
                      <option value="">Select a tag</option>
                      {TAG_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={addTag}
                      disabled={!tagSelect || tags.includes(tagSelect) || tags.length >= MAX_TAGS}
                      style={addTagBtn(!tagSelect || tags.includes(tagSelect) || tags.length >= MAX_TAGS)}
                    >
                      Add Tag
                    </button>
                  </div>

                  <div style={tagList}>
                    {tags.map((t) => (
                      <span key={t} style={tagPill}>
                        {t}
                        <span
                          role="button"
                          tabIndex={0}
                          style={tagRemove}
                          onClick={() => removeTag(t)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") removeTag(t);
                          }}
                          aria-label={`Remove ${t}`}
                        >
                          ×
                        </span>
                      </span>
                    ))}
                  </div>

                  <div style={tagLimitInfo}>
                    <span style={{ fontWeight: 800 }}>{tags.length}</span>/{MAX_TAGS} tags selected
                  </div>
                </div>

                {touched.tags && errors.tags ? (
                  <div style={errorText}>{errors.tags}</div>
                ) : null}
              </div>

              {/* Max members */}
              <div style={formGroup}>
                <label style={label}>Maximum Members (Optional)</label>
                <input
                  style={input}
                  type="number"
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(e.target.value)}
                  placeholder="Leave empty for unlimited"
                />
              </div>

              {/* Progress */}
              <div style={{ marginTop: 6 }}>
                <div style={progressBar}>
                  <div style={{ ...progressFill, width: `${completion}%` }} />
                </div>
                <p style={progressText}>
                  <span style={{ fontWeight: 800 }}>{completion}</span>% Complete
                </p>
              </div>
            </div>

            {/* Footer */}
            <div style={cardFooter}>
              <button
                type="button"
                style={cancelBtn}
                onClick={() => navigate("/groups")}
              >
                Cancel
              </button>

              <button type="submit" style={createBtn(canSubmit)} disabled={!canSubmit}>
                Create Group
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ---------- styles (basic black/grey palette) ---------- */

const page = {
  background: "#f5f5f5",
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const container = {
  maxWidth: 600,
  width: "100%",
};

const card = {
  background: "#fff",
  borderRadius: 12,
  boxShadow: "0 4px 6px rgba(0,0,0,0.08)",
  overflow: "hidden",
  border: "1px solid #e6e6e6",
};

const cardHeader = {
  padding: 24,
  borderBottom: "1px solid #e0e0e0",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const closeBtn = {
  fontSize: 28,
  lineHeight: "28px",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  color: "#666",
};

const cardBody = {
  padding: 24,
};

const formGroup = {
  marginBottom: 20,
};

const label = {
  display: "block",
  marginBottom: 8,
  fontWeight: 600,
  color: "#444",
};

const input = {
  width: "100%",
  padding: 12,
  border: "1px solid #ddd",
  borderRadius: 8,
  fontSize: 14,
  outline: "none",
};

const formRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 20,
};

const privacyOptions = {
  display: "flex",
  gap: 20,
  marginTop: 8,
};

const privacyOption = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#444",
  fontWeight: 600,
};

const tagsContainer = {
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: 12,
};

const tagDropdown = {
  display: "flex",
  gap: 10,
  marginBottom: 12,
  alignItems: "center",
};

function addTagBtn(disabled) {
  return {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid",
    borderColor: disabled ? "#ccc" : "#111",
    background: disabled ? "#eee" : "#111",
    color: disabled ? "#777" : "#fff",
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
  };
}

const tagList = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  minHeight: 34,
};

const tagPill = {
  background: "#f3f3f3",
  color: "#111",
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const tagRemove = {
  cursor: "pointer",
  fontWeight: 900,
  fontSize: 16,
  opacity: 0.7,
};

const tagLimitInfo = {
  fontSize: 12,
  color: "#666",
  marginTop: 8,
  textAlign: "right",
};

const imageUpload = {
  border: "2px dashed #ddd",
  borderRadius: 8,
  padding: 24,
  textAlign: "center",
  cursor: "pointer",
  userSelect: "none",
};

const progressBar = {
  width: "100%",
  height: 4,
  background: "#ededed",
  borderRadius: 2,
  overflow: "hidden",
};

const progressFill = {
  height: "100%",
  background: "#111",
  width: "0%",
  transition: "width 0.25s ease",
};

const progressText = {
  textAlign: "right",
  fontSize: 12,
  color: "#666",
  marginTop: 6,
};

const errorText = {
  color: "#b00020",
  fontSize: 12,
  marginTop: 6,
  fontWeight: 600,
};

const cardFooter = {
  padding: 24,
  borderTop: "1px solid #e0e0e0",
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
};

const cancelBtn = {
  padding: "12px 24px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "#f5f5f5",
  color: "#333",
  fontWeight: 800,
  cursor: "pointer",
};

function createBtn(enabled) {
  return {
    padding: "12px 24px",
    borderRadius: 8,
    border: "1px solid",
    borderColor: enabled ? "#111" : "#bbb",
    background: enabled ? "#111" : "#ccc",
    color: "#fff",
    fontWeight: 900,
    cursor: enabled ? "pointer" : "not-allowed",
  };
}