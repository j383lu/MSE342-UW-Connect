// client/src/components/App/Groups/CreateGroupForm.js

import React, { useEffect, useMemo, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { FirebaseContext } from '../../Firebase';

export default function CreateGroupForm() {
  const navigate = useNavigate();
  const firebase = useContext(FirebaseContext);

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

        const user = firebase.auth.currentUser;
        const token = user ? await user.getIdToken() : null;

        // console.log("Fetching tags from /api/tags...");
        // const res = await fetch("/api/tags");
        // console.log("Tags response status:", res.status);
        
        const res = await fetch("/api/tags", {
          headers: token ? { 'Authorization': token } : {} // Only send if user is loaded
        });

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
  }, [firebase.auth]);

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
    if (!canSubmit) return;

    setIsSubmitting(true);
    setSubmitError("");

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
      const user = firebase.auth.currentUser;
      if (!user) {
        throw new Error("Authentication required. Please log in again.");
      }
      const token = await user.getIdToken();
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      formData.append('category', category);
      formData.append('isOpen', privacy === "public");
      formData.append('maxMembers', maxMembers || '');

      // Attach current app user id so backend can set creator_id correctly
      // const currentUserId = localStorage.getItem('currentUserId');
      // if (currentUserId) {
      //   formData.append('user_id', currentUserId);
      // }
      
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

      // const res = await fetch(apiUrl, {
      //   method: 'POST',
      //   body: formData,
      // });
      const res = await fetch("/api/groups", {
        method: 'POST',
        headers: { 
          'Authorization': token // Add token here
          // NOTE: Do NOT set Content-Type; FormData sets it automatically
        },
        body: formData,
      });

      console.log("Response status:", res.status);
      
      // Check if response is OK
      // if (!res.ok) {
      //   const responseText = await res.text();
      //   console.error("Error response:", responseText.substring(0, 500));
        
      //   // Try to parse as JSON if possible
      //   try {
      //     const errorData = JSON.parse(responseText);
      //     throw new Error(errorData.error || errorData.details || `Server error: ${res.status}`);
      //   } catch (e) {
      //     // If not JSON, throw the text
      //     throw new Error(`Server returned ${res.status}: ${responseText.substring(0, 100)}`);
      //   }
      // }
      
      if (!res.ok) {
        const errorText = await res.text();
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || `Server Error: ${res.status}`);
        } catch (e) {
          if (errorText.includes("Proxy error")) {
            throw new Error("Backend server is down (Proxy Error). Check your terminal!");
          }
          throw new Error(`Server returned ${res.status}: ${errorText.substring(0, 50)}...`);
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
  background: "radial-gradient(circle at top left, rgba(93,108,92,0.12), transparent 35%), #FDFDF6",
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 20px",
};

const container = { maxWidth: 650, width: "100%" };

const card = {
  background: "#FFFFFF",
  borderRadius: 28,
  boxShadow: "0 18px 45px rgba(23,41,43,0.05)",
  overflow: "hidden",
  border: "1px solid #D6DFE2",
  borderTop: "6px solid #5D6C5C",
};

const cardHeader = {
  padding: "24px 32px",
  borderBottom: "1px solid #EEF1F2",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "#FFFFFF",
};

const closeBtn = {
  fontSize: 24,
  fontWeight: 700,
  border: "none",
  background: "rgba(93,108,92,0.1)",
  background: "#F4EEE5",
  cursor: "pointer",
  color: "#17292B",
  width: 36,
  height: 36,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s ease",
};

const cardBody = { padding: "32px" };

const formGroup = { marginBottom: 24 };

const label = {
  display: "block",
  marginBottom: 10,
  fontWeight: 700,
  color: "#17292B",
  fontSize: 14,
};

const input = {
  width: "100%",
  padding: "14px 18px",
  border: "2px solid #D6DFE2",
  borderRadius: 16,
  fontSize: 14,
  outline: "none",
  background: "#F9FAFA",
  color: "#17292B",
  boxSizing: "border-box",
  transition: "border-color 0.2s ease",
};

const formRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 24,
};

const privacyOptions = { display: "flex", gap: 12, marginTop: 10 };

const privacyOption = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "#17292B",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};

const imageUpload = (hasPreview) => ({
  border: "2px dashed #5D6C5C",
  borderRadius: 20,
  padding: hasPreview ? 0 : 28,
  textAlign: "center",
  cursor: "pointer",
  minHeight: 160,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  backgroundColor: "rgba(93,108,92,0.02)",
  transition: "all 0.2s ease",
});

const imagePreview = {
  width: "100%",
  maxHeight: 220,
  objectFit: "cover",
};

const progressContainer = {
  marginBottom: 24,
};

const progressBar = {
  width: "100%",
  height: 4,
  background: "#F0F3F0",
  borderRadius: 10,
  overflow: "hidden",
};

const progressFill = {
  height: "100%",
  background: "#5D6C5C",
  width: "0%",
  transition: "width 0.25s ease",
};

const progressText = {
  textAlign: "right",
  fontSize: 12,
  color: "#5D6C5C",
  fontWeight: 600,
  marginTop: 8,
};

const errorText = {
  color: "#b00020",
  fontSize: 12,
  marginTop: 6,
  fontWeight: 600,
};

const cardFooter = {
  padding: 24,
  borderTop: "1px solid #EEF1F2",
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
};

const cancelBtn = (disabled) => ({
  padding: "12px 28px",
  borderRadius: 30,
  border: "2px solid #D6DFE2",
  background: "transparent",
  color: "#17292B",
  fontWeight: 700,
  fontSize: 15,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.5 : 1,
  transition: "all 0.2s",
});

function createBtn(enabled) {
  return {
    padding: "12px 28px",
    borderRadius: 30,
    border: "none",
    background: enabled ? "#17292B" : "#D6DFE2",
    color: enabled ? "#FDFDF6" : "#9DA3A8",
    fontWeight: 700,
    fontSize: 15,
    cursor: enabled ? "pointer" : "not-allowed",
    boxShadow: enabled ? "0 8px 20px rgba(23,41,43,0.15)" : "none",
    transition: "all 0.2s",
  };
}