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

  // Tags from DB
  const [tagOptions, setTagOptions] = useState([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [tagsError, setTagsError] = useState("");

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    // Load tags for category dropdown
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
    // Load group data
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
        
        // Populate form fields
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
    // Clean up preview URL
    return () => {
      if (coverPreview) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [coverPreview]);

  const canSubmit = useMemo(() => {
    return name.trim().length >= 3 && 
           description.trim().length >= 5 && 
           category && 
           privacy &&
           !isSubmitting;
  }, [name, description, category, privacy, isSubmitting]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setSubmitError("Image size must be less than 10MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setSubmitError("File must be an image");
      return;
    }

    // Clean up previous preview
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
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      formData.append('category', category);
      formData.append('isOpen', privacy === "public");
      formData.append('maxMembers', maxMembers || '');
      
      if (coverImage) {
        formData.append('coverImage', coverImage);
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
        throw new Error(errorData.error || 'Failed to update group');
      }

      const updatedGroup = await res.json();
      navigate(`/groups/${groupId}`);
      
    } catch (err) {
      console.error('Error updating group:', err);
      setSubmitError(err.message || 'Failed to update group. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={container}>
        <button style={secondaryBtn} onClick={() => navigate("/groups")}>
          ← Back
        </button>
        <div style={card}>
          <p>Loading group...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={container}>
        <button style={secondaryBtn} onClick={() => navigate("/groups")}>
          ← Back
        </button>
        <div style={card}>
          <h2>Error</h2>
          <p style={{ color: "#b00020" }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={container}>
      <div style={headerRow}>
        <h1 style={{ margin: 0 }}>Edit Group</h1>
        <button style={secondaryBtn} onClick={() => navigate(`/groups/${groupId}`)}>
          ← Back to Group
        </button>
      </div>

      <form onSubmit={onSubmit} style={card}>
        
        {/* Cover Image */}
        <div style={formGroup}>
          <label style={label}>Group Cover Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={{ display: 'none' }}
            id="cover-image-input"
          />
          <label htmlFor="cover-image-input" style={imageUpload(!!coverPreview || !!currentImageUrl)}>
            {coverPreview ? (
              <img 
                src={coverPreview} 
                alt="Cover preview" 
                style={imagePreview}
              />
            ) : currentImageUrl ? (
              <img 
                src={`/uploads/${currentImageUrl}`} 
                alt="Current cover" 
                style={imagePreview}
              />
            ) : (
              <>
                <div style={{ fontSize: 34, marginBottom: 8 }}>📷</div>
                <div style={{ fontWeight: 600 }}>
                  Click to upload new cover image
                </div>
              </>
            )}
            <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
              PNG, JPG, GIF up to 10MB
            </div>
          </label>
          {currentImageUrl && !coverImage && (
            <p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              Current image: {currentImageUrl}
            </p>
          )}
        </div>

        {/* Group Name */}
        <div style={formGroup}>
          <label style={label}>Group Name *</label>
          <input 
            style={input} 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="e.g., Study Group 2024"
            disabled={isSubmitting}
          />
          {name.trim().length < 3 && name && (
            <p style={errorText}>Name must be at least 3 characters</p>
          )}
        </div>

        {/* Description */}
        <div style={formGroup}>
          <label style={label}>Description *</label>
          <textarea
            style={{ ...input, minHeight: 90 }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your group's purpose..."
            disabled={isSubmitting}
          />
          {description.trim().length < 5 && description && (
            <p style={errorText}>Description must be at least 5 characters</p>
          )}
        </div>

        {/* Category */}
        <div style={formGroup}>
          <label style={label}>Category *</label>
          <select 
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
          {tagsError && <p style={errorText}>{tagsError}</p>}
          {!category && <p style={errorText}>Category is required</p>}
        </div>

        {/* Privacy and Max Members Row */}
        <div style={formRow}>
          <div style={{ flex: 1 }}>
            <label style={label}>Privacy *</label>
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

          <div style={{ flex: 1 }}>
            <label style={label}>Maximum Members</label>
            <input
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

        {/* Error Message */}
        {submitError && (
          <div style={{ ...errorText, marginBottom: 16, textAlign: 'center', padding: 8, background: '#fff0f0', borderRadius: 4 }}>
            Error: {submitError}
          </div>
        )}

        {/* Submit Button */}
        <button 
          type="submit" 
          disabled={!canSubmit} 
          style={primaryBtn(canSubmit)}
        >
          {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

// Styles

const page = {
  background: "radial-gradient(circle at top left, rgba(93,108,92,0.12), transparent 35%), #FDFDF6",
  minHeight: "100vh",
  padding: "60px 20px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const container = {
  maxWidth: 680, 
  width: "100%",
  margin: "0 auto",
};

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  marginBottom: 28,
  width: "100%",
};

const pageTitle = {
  fontSize: "2.2rem",
  fontWeight: 750,
  color: "#17292B",
  margin: 0,
};

const card = {
  background: "#FFFFFF",
  borderRadius: 28,
  padding: "32px",
  marginTop: 14,
  border: "1px solid #D6DFE2",
  borderTop: "6px solid #5D6C5C",
  boxShadow: "0 18px 45px rgba(23,41,43,0.05)",
  width: "100%",
  boxSizing: "border-box",
};

const formGroup = {
  marginBottom: 24
};

const label = { 
  display: "block", 
  marginBottom: 8, 
  fontWeight: 700,
  color: "#17292B",
  fontSize: 14
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
  transition: "all 0.2s ease",
};

const formRow = {
  display: "flex",
  gap: 24,
  marginBottom: 24
};

const privacyOptions = { 
  display: "flex", 
  gap: 20, 
  marginTop: 8 
};

const privacyOption = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#444",
  fontWeight: 600,
  cursor: "pointer",
};

const imageUpload = (hasPreview) => ({
  border: "2px dashed #ddd",
  borderRadius: 8,
  padding: hasPreview ? 0 : 24,
  textAlign: "center",
  cursor: "pointer",
  userSelect: "none",
  minHeight: 150,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  backgroundColor: "#fafafa",
});

const imagePreview = {
  width: "100%",
  maxHeight: 200,
  objectFit: "cover",
};

const errorText = {
  color: "#b00020",
  fontSize: 12,
  marginTop: 4,
  fontWeight: 500,
};

const secondaryBtn = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #bbb",
  background: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

function primaryBtn(enabled) {
  return {
    marginTop: 14,
    padding: "12px 24px",
    borderRadius: 10,
    border: "1px solid",
    borderColor: enabled ? "#111" : "#bbb",
    background: enabled ? "#111" : "#ccc",
    color: "#fff",
    fontWeight: 900,
    cursor: enabled ? "pointer" : "not-allowed",
    width: "100%",
    fontSize: 16,
  };
}