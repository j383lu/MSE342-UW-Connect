// client/src/components/App/Groups/CreateGroupForm.js

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CreateGroupForm() {
  const navigate = useNavigate();

  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [privacy, setPrivacy] = useState("");
  const [maxMembers, setMaxMembers] = useState("");

  // Tags from DB
  const [tagOptions, setTagOptions] = useState([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [tagsError, setTagsError] = useState("");

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [touched, setTouched] = useState({
    name: false,
    description: false,
    category: false,
    privacy: false,
  });

  useEffect(() => {
    // Clean up preview URL when component unmounts
    return () => {
      if (coverPreview) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [coverPreview]);

  useEffect(() => {
    async function loadTags() {
      try {
        setLoadingTags(true);
        setTagsError("");

        console.log("Fetching tags from /api/tags...");
        const res = await fetch("/api/tags");
        console.log("Tags response status:", res.status);
        
        // Check if response is OK
        if (!res.ok) {
          const text = await res.text();
          console.error("Error response (not JSON):", text.substring(0, 200));
          throw new Error(`Server returned ${res.status}: ${res.statusText}`);
        }

        // Check content type
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await res.text();
          console.error("Non-JSON response:", text.substring(0, 200));
          throw new Error("Server returned non-JSON response");
        }

        const data = await res.json();
        console.log("Tags data received:", data);
        setTagOptions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading tags:", err);
        setTagsError(`Could not load tags: ${err.message}`);
        setTagOptions([]);
      } finally {
        setLoadingTags(false);
      }
    }

    loadTags();
  }, []);

  const errors = useMemo(() => {
    const e = {};
    if (!name.trim()) e.name = "Group name is required";
    if (!description.trim()) e.description = "Description is required";
    if (!category) e.category = "Please select a category";
    if (!privacy) e.privacy = "Please select a privacy option";
    return e;
  }, [name, description, category, privacy]);

  const completion = useMemo(() => {
    let done = 0;
    if (name.trim()) done++;
    if (description.trim()) done++;
    if (category) done++;
    if (privacy) done++;
    if (coverImage) done++;
    return Math.round((done / 5) * 100);
  }, [name, description, category, privacy, coverImage]);

  const canSubmit = useMemo(() => 
    Object.keys(errors).length === 0 && !isSubmitting, 
    [errors, isSubmitting]
  );

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

    setTouched({
      name: true,
      description: true,
      category: true,
      privacy: true,
    });

    if (!canSubmit) return;

    setIsSubmitting(true);
    setSubmitError("");
    setUploadProgress(0);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      formData.append('category', category);
      formData.append('isOpen', privacy === "public");
      formData.append('maxMembers', maxMembers || '');
      
      if (coverImage) {
        formData.append('coverImage', coverImage);
      }

      // Log what we're sending
      console.log("Sending group data:", {
        name: name.trim(),
        description: description.trim(),
        category,
        isOpen: privacy === "public",
        maxMembers: maxMembers || '',
        hasImage: !!coverImage
      });

      // Use full URL in Codespaces
      const baseUrl = window.location.origin;
      const apiUrl = `${baseUrl}/api/groups`;
      console.log("Sending request to:", apiUrl);

      const res = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      console.log("Response status:", res.status);
      
      // Check if response is OK
      if (!res.ok) {
        const responseText = await res.text();
        console.error("Error response:", responseText.substring(0, 500));
        
        // Try to parse as JSON if possible
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.error || errorData.details || `Server error: ${res.status}`);
        } catch (e) {
          // If not JSON, throw the text
          throw new Error(`Server returned ${res.status}: ${responseText.substring(0, 100)}`);
        }
      }

      // Check content type
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON success response:", text.substring(0, 200));
        throw new Error("Server returned non-JSON response");
      }

      const newGroup = await res.json();
      console.log("Group created successfully:", newGroup);
      
      setUploadProgress(100);
      
      // Navigate to the new group page
      setTimeout(() => {
        navigate(`/groups/${newGroup.id}`);
      }, 500);

    } catch (err) {
      console.error('Error creating group:', err);
      setSubmitError(err.message || 'Failed to create group. Please try again.');
      setUploadProgress(0);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Rest of your component remains the same...
  return (
    <div style={page}>
      <div style={container}>
        <div style={card}>
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
            <div style={cardBody}>
              {/* Image Upload with Preview */}
              <div style={formGroup}>
                <label style={label}>Group Cover Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                  id="cover-image-input"
                />
                <label htmlFor="cover-image-input" style={imageUpload(!!coverPreview)}>
                  {coverPreview ? (
                    <img 
                      src={coverPreview} 
                      alt="Cover preview" 
                      style={imagePreview}
                    />
                  ) : (
                    <>
                      <div style={{ fontSize: 34, marginBottom: 8 }}>📷</div>
                      <div style={{ fontWeight: 600 }}>
                        Click to upload cover image
                      </div>
                    </>
                  )}
                  <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
                    PNG, JPG, GIF up to 10MB
                  </div>
                </label>
              </div>

              {/* Upload Progress Bar */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div style={progressContainer}>
                  <div style={progressBar}>
                    <div style={{ ...progressFill, width: `${uploadProgress}%` }} />
                  </div>
                  <p style={progressText}>Uploading: {uploadProgress}%</p>
                </div>
              )}

              {/* Group Name */}
              <div style={formGroup}>
                <label style={label}>Group Name *</label>
                <input
                  style={input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                  placeholder="e.g., Study Group 2024"
                  disabled={isSubmitting}
                />
                {touched.name && errors.name && (
                  <div style={errorText}>{errors.name}</div>
                )}
              </div>

              {/* Description */}
              <div style={formGroup}>
                <label style={label}>Description *</label>
                <textarea
                  style={{ ...input, minHeight: 100, resize: "vertical" }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, description: true }))}
                  placeholder="Describe your group's purpose..."
                  disabled={isSubmitting}
                />
                {touched.description && errors.description && (
                  <div style={errorText}>{errors.description}</div>
                )}
              </div>

              {/* Category and Privacy Row */}
              <div style={formRow}>
                <div style={formGroup}>
                  <label style={label}>Category *</label>
                  <select
                    style={input}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, category: true }))}
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
                  {tagsError && <div style={errorText}>{tagsError}</div>}
                  {touched.category && errors.category && (
                    <div style={errorText}>{errors.category}</div>
                  )}
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
                        onBlur={() => setTouched((t) => ({ ...t, privacy: true }))}
                        disabled={isSubmitting}
                      />
                      Private
                    </label>
                  </div>
                  {touched.privacy && errors.privacy && (
                    <div style={errorText}>{errors.privacy}</div>
                  )}
                </div>
              </div>

              {/* Max Members */}
              <div style={formGroup}>
                <label style={label}>Maximum Members (Optional)</label>
                <input
                  style={input}
                  type="number"
                  min="1"
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(e.target.value)}
                  placeholder="Leave empty for unlimited"
                  disabled={isSubmitting}
                />
              </div>

              {/* Error Message */}
              {submitError && (
                <div style={{ ...errorText, marginBottom: 16, textAlign: 'center', padding: 8, background: '#fff0f0', borderRadius: 4 }}>
                  Error: {submitError}
                </div>
              )}

              {/* Completion Progress */}
              <div style={{ marginTop: 6 }}>
                <div style={progressBar}>
                  <div style={{ ...progressFill, width: `${completion}%` }} />
                </div>
                <p style={progressText}>
                  <span style={{ fontWeight: 800 }}>{completion}</span>% Complete
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div style={cardFooter}>
              <button 
                type="button" 
                style={cancelBtn(isSubmitting)} 
                onClick={() => navigate("/groups")}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                style={createBtn(canSubmit && !isSubmitting)} 
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Updated styles with functions where needed
const page = {
  background: "#f5f5f5",
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const container = { maxWidth: 600, width: "100%" };

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
  padding: "0 8px",
  borderRadius: 4,
  ":hover": {
    background: "#f0f0f0"
  }
};

const cardBody = { padding: 24 };

const formGroup = { marginBottom: 20 };

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
  boxSizing: "border-box",
  ":focus": {
    borderColor: "#111"
  }
};

const formRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 20,
};

const privacyOptions = { display: "flex", gap: 20, marginTop: 8 };

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
  ":hover": {
    borderColor: "#999"
  }
});

const imagePreview = {
  width: "100%",
  maxHeight: 200,
  objectFit: "cover",
};

const progressContainer = {
  marginBottom: 20,
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

const cancelBtn = (disabled) => ({
  padding: "12px 24px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "#f5f5f5",
  color: "#333",
  fontWeight: 800,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.5 : 1,
});

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
    opacity: enabled ? 1 : 0.5,
  };
}