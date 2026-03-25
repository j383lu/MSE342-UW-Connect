// client/src/components/App/Groups/EditGroupForm.js

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAuth } from "firebase/auth";
import apiRequest from "../../../utils/api";

export default function EditGroupForm() {
  const navigate = useNavigate();
  const { groupId } = useParams();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [maxMembers, setMaxMembers] = useState("");
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [currentImageUrl, setCurrentImageUrl] = useState("");

  const [tagOptions, setTagOptions] = useState([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [tagsError, setTagsError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    async function loadTags() {
      try {
        setLoadingTags(true);
        setTagsError("");

        const res = await apiRequest("/api/tags");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        setTagOptions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading tags:", err);
        setTagsError("Could not load tags from database.");
        setTagOptions([]);
      } finally {
        setLoadingTags(false);
      }
    }

    loadTags();
  }, []);

  useEffect(() => {
    async function loadGroup() {
      try {
        setLoading(true);
        setError("");

        const res = await apiRequest(`/api/groups/${groupId}`);

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Group not found");
          }
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        setGroup(data);

        setName(data.name || "");
        setDescription(data.description || "");
        setCategory(data.category || "");
        setPrivacy(data.is_private ? "private" : "public");
        setMaxMembers(data.max_members || "");
        setCurrentImageUrl(data.image_url || "");
      } catch (err) {
        console.error("Error loading group:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadGroup();
  }, [groupId]);

  useEffect(() => {
    return () => {
      if (coverPreview) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [coverPreview]);

  const canSubmit = useMemo(() => {
    return (
      name.trim().length >= 3 &&
      description.trim().length >= 5 &&
      category &&
      privacy &&
      !isSubmitting
    );
  }, [name, description, category, privacy, isSubmitting]);

  const createdLabel = useMemo(() => {
    if (!group?.created_at) return null;
    const d = new Date(group.created_at);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString();
  }, [group]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setSubmitError("Image size must be less than 10MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSubmitError("File must be an image");
      return;
    }

    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
    }

    setCoverImage(file);
    setCoverPreview(URL.createObjectURL(file));
    setSubmitError("");
  };

  async function onSubmit(e) {
    e.preventDefault();

    if (!canSubmit) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("description", description.trim());
      formData.append("category", category);
      formData.append("isOpen", privacy === "public");
      formData.append("maxMembers", maxMembers || "");

      if (coverImage) {
        formData.append("coverImage", coverImage);
      }

      const auth = getAuth();
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PUT",
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update group");
      }

      await res.json();
      navigate(`/groups/${groupId}`);
    } catch (err) {
      console.error("Error updating group:", err);
      setSubmitError(err.message || "Failed to update group. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={page}>
        <div style={container}>
          <div style={navBar}>
            <button type="button" style={backLink} onClick={() => navigate("/groups")}>
              ← Back to Groups
            </button>
          </div>
          <div style={mainCard}>
            <p style={{ color: "#686967", margin: 0 }}>Loading group...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={page}>
        <div style={container}>
          <div style={navBar}>
            <button type="button" style={backLink} onClick={() => navigate("/groups")}>
              ← Back to Groups
            </button>
          </div>
          <div style={mainCard}>
            <h2 style={{ marginTop: 0, color: "#b00020" }}>Error</h2>
            <p style={{ color: "#555" }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={page}>
      <div style={container}>
        <div style={navBar}>
          <button type="button" style={backLink} onClick={() => navigate(`/groups/${groupId}`)}>
            ← Back to Group
          </button>
          <button
            type="button"
            style={btn("secondary")}
            onClick={() => navigate(`/groups/${groupId}`)}
          >
            Cancel
          </button>
        </div>

        <div style={cover}>
          <div style={bannerGlowOne} />
          <div style={bannerGlowTwo} />
          <div style={bannerOverlay} />
          <div style={{ position: "relative", zIndex: 2, width: "100%", height: "100%" }}>
            {coverPreview ? (
              <img src={coverPreview} alt="" style={coverImageStyle} />
            ) : currentImageUrl ? (
              <img src={`/uploads/${currentImageUrl}`} alt="" style={coverImageStyle} />
            ) : null}
          </div>
          <div style={avatar}>👥</div>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={{ display: "none" }}
            id="cover-image-input"
          />
          <label htmlFor="cover-image-input" style={coverChangeBtn}>
            Change cover
          </label>
        </div>

        <form onSubmit={onSubmit} style={mainCard}>
          <div style={groupHeader}>
            <div style={titleSection}>
              <h1 style={groupTitle}>{name.trim() || group?.name || "Group"}</h1>
              <p style={editHint}>Update your group details below.</p>
              {createdLabel ? (
                <div style={groupMeta}>
                  <span style={metaItem}>📅 Created {createdLabel}</span>
                </div>
              ) : null}
              <div style={badges}>
                <span style={badge(privacy === "private" ? "private" : "public")}>
                  {privacy === "private" ? "Private Group" : "Public Group"}
                </span>
                {category ? (
                  <span style={badge("category")}>{category}</span>
                ) : (
                  <span style={{ ...badge("category"), opacity: 0.65 }}>Category</span>
                )}
              </div>
            </div>
          </div>

          <div style={section}>
            <h3 style={sectionTitle}>About</h3>
            <div style={formGroup}>
              <label style={label} htmlFor="edit-group-name">
                Group name *
              </label>
              <input
                id="edit-group-name"
                style={input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Study Group 2024"
                disabled={isSubmitting}
              />
              {name.trim().length < 3 && name ? (
                <p style={errorText}>Name must be at least 3 characters</p>
              ) : null}
            </div>
            <div style={formGroup}>
              <label style={label} htmlFor="edit-group-description">
                Description *
              </label>
              <textarea
                id="edit-group-description"
                style={{ ...input, minHeight: 100, resize: "vertical" }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your group's purpose..."
                disabled={isSubmitting}
              />
              {description.trim().length < 5 && description ? (
                <p style={errorText}>Description must be at least 5 characters</p>
              ) : null}
            </div>
            <p style={coverHint}>Cover: PNG, JPG, or GIF up to 10MB — use Change cover on the banner.</p>
          </div>

          <div style={section}>
            <h3 style={sectionTitle}>Category</h3>
            <div style={formGroup}>
              <label style={label} htmlFor="edit-group-category">
                Category *
              </label>
              <select
                id="edit-group-category"
                style={input}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={loadingTags || isSubmitting}
              >
                <option value="">
                  {loadingTags ? "Loading categories..." : "Select a category"}
                </option>
                {tagOptions.map((t) => (
                  <option key={t.tag_id} value={t.tag_name}>
                    {t.tag_name}
                  </option>
                ))}
              </select>
              {tagsError ? <p style={errorText}>{tagsError}</p> : null}
              {!category ? <p style={errorText}>Category is required</p> : null}
            </div>
          </div>

          <div style={section}>
            <h3 style={sectionTitle}>Privacy & size</h3>
            <div style={formRow}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <span style={label}>Privacy *</span>
                <div style={privacyOptions}>
                  <label style={privacyOption}>
                    <input
                      type="radio"
                      name="privacy"
                      value="public"
                      checked={privacy === "public"}
                      onChange={(e) => setPrivacy(e.target.value)}
                      disabled={isSubmitting}
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
                      disabled={isSubmitting}
                    />
                    Private
                  </label>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={label} htmlFor="edit-group-max">
                  Maximum members
                </label>
                <input
                  id="edit-group-max"
                  style={input}
                  type="number"
                  min="1"
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(e.target.value)}
                  placeholder="Unlimited"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {submitError ? (
            <div style={submitErrorBox} role="alert">
              {submitError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              ...btn("primary", !canSubmit || isSubmitting),
              width: "100%",
              marginTop: 8,
              padding: "14px 22px",
              fontSize: 15,
            }}
          >
            {isSubmitting ? "Saving changes…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ——— styles (aligned with GroupDetailsPage) ——— */

const page = {
  background:
    "radial-gradient(circle at top left, rgba(93,108,92,0.12), transparent 35%), #FDFDF6",
  minHeight: "100vh",
  padding: "40px 20px",
};

const container = {
  maxWidth: 1000,
  margin: "0 auto",
};

const navBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 24,
  padding: "10px 0",
};

const backLink = {
  border: "none",
  background: "transparent",
  color: "#5D6C5C",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 16,
};

const cover = {
  height: 200,
  borderRadius: "28px",
  position: "relative",
  marginBottom: 60,
  background: "linear-gradient(135deg, #5D6C5C 0%, #17292B 100%)",
  overflow: "visible",
  boxShadow: "0 10px 30px rgba(23,41,43,0.1)",
};

const coverImageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const avatar = {
  width: 130,
  height: 130,
  background: "#FFFFFF",
  borderRadius: "50%",
  position: "absolute",
  bottom: -65,
  left: 40,
  border: "6px solid #FFFFFF",
  boxShadow: "0 18px 45px rgba(23,41,43,0.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 52,
  color: "#17292B",
  zIndex: 3,
};

const coverChangeBtn = {
  position: "absolute",
  bottom: 16,
  right: 16,
  zIndex: 4,
  padding: "10px 18px",
  borderRadius: 30,
  background: "rgba(255,255,255,0.94)",
  border: "1px solid #D6DFE2",
  fontSize: 13,
  fontWeight: 800,
  color: "#17292B",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(23,41,43,0.08)",
};

const mainCard = {
  background: "white",
  borderRadius: 28,
  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  padding: 30,
  marginTop: -50,
  border: "1px solid #eee",
};

const groupHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 20,
  paddingLeft: 140,
};

const titleSection = {
  width: "100%",
};

const groupTitle = {
  fontSize: 32,
  color: "#111",
  margin: "0 0 8px 0",
  fontWeight: 800,
};

const editHint = {
  margin: "0 0 12px 0",
  color: "#686967",
  fontSize: 15,
};

const groupMeta = {
  display: "flex",
  gap: 20,
  color: "#686967",
  fontSize: 14,
  flexWrap: "wrap",
  marginBottom: 10,
};

const metaItem = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const badges = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

function badge(kind) {
  const base = {
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid #ddd",
    background: "#f5f5f5",
    color: "#111",
  };

  if (kind === "public") return { ...base, background: "#e8f5e8", borderColor: "#c8e6c9" };
  if (kind === "private") return { ...base, background: "#fff0f0", color: "#b00020", borderColor: "#ffcdd2" };
  if (kind === "category") return { ...base, background: "#f0f0f0" };
  return base;
}

const section = {
  marginBottom: 28,
  paddingTop: 8,
  borderTop: "1px solid #EEF1F2",
};

const sectionTitle = {
  fontSize: 18,
  fontWeight: 900,
  color: "#111",
  marginBottom: 16,
};

const formGroup = {
  marginBottom: 20,
};

const label = {
  display: "block",
  marginBottom: 8,
  fontWeight: 700,
  color: "#17292B",
  fontSize: 14,
};

const input = {
  width: "100%",
  padding: "14px 18px",
  borderRadius: 16,
  border: "2px solid #D6DFE2",
  outline: "none",
  fontSize: 14,
  background: "#F9FAFA",
  color: "#17292B",
  boxSizing: "border-box",
};

const formRow = {
  display: "flex",
  gap: 24,
  flexWrap: "wrap",
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
  cursor: "pointer",
};

const errorText = {
  color: "#b00020",
  fontSize: 12,
  marginTop: 6,
  fontWeight: 500,
};

const coverHint = {
  fontSize: 13,
  color: "#686967",
  margin: "4px 0 0 0",
};

const submitErrorBox = {
  color: "#b00020",
  marginBottom: 16,
  padding: "12px 14px",
  background: "#fff5f5",
  borderRadius: 12,
  border: "1px solid #ffcdd2",
  fontSize: 14,
};

function btn(kind, disabled = false) {
  const base = {
    padding: "10px 20px",
    border: "1px solid",
    borderRadius: 30,
    fontSize: 14,
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };

  if (kind === "primary") {
    return { ...base, background: "#111", color: "#fff", borderColor: "#111" };
  }
  if (kind === "secondary") {
    return { ...base, background: "#fff", color: "#111", borderColor: "#bbb" };
  }
  return base;
}

const bannerOverlay = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 100%)",
  pointerEvents: "none",
  zIndex: 1,
};

const bannerGlowOne = {
  position: "absolute",
  top: -80,
  right: -50,
  width: 260,
  height: 260,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.14)",
  filter: "blur(20px)",
  pointerEvents: "none",
};

const bannerGlowTwo = {
  position: "absolute",
  bottom: -70,
  left: -30,
  width: 220,
  height: 220,
  borderRadius: "50%",
  background: "rgba(244,238,229,0.12)",
  filter: "blur(18px)",
  pointerEvents: "none",
};
