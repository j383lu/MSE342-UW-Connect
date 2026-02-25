import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Chip,
  Stack,
  Card,
  CardContent,
  Button,
  TextField,
  Divider,
  Snackbar,
  Alert,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

// Frontend-only placeholder list.
// Real version should be backend validation/moderation.
const RESTRICTED_WORDS = ["slur1", "slur2", "badword1"];

function validateDisplayName(rawName) {
  const trimmed = rawName.trim();

  if (!trimmed) return "Name cannot be empty.";

  // Only letters, numbers, spaces
  if (!/^[a-zA-Z0-9 ]+$/.test(trimmed)) {
    return "Only alphanumeric characters and spaces are allowed.";
  }

  // If you choose truncation with maxLength, this won't trigger.
  // Kept here for safety in case maxLength is removed later.
  if (trimmed.length > 30) {
    return "Name must be 30 characters or fewer.";
  }

  const lower = trimmed.toLowerCase();
  if (RESTRICTED_WORDS.some((w) => lower.includes(w))) {
    return "Please choose a different name.";
  }

  return "";
}
function EditProfile() {
  const navigate = useNavigate();

  const [draft, setDraft] = useState(null);
  const [original, setOriginal] = useState(null);

  const [newCourse, setNewCourse] = useState("");

  const [nameError, setNameError] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // 🔮 Future backend call
        // const res = await fetch("/api/profile");
        // if (!res.ok) throw new Error("Failed to fetch profile");
        // const data = await res.json();

        // Temporary placeholder until backend is ready
        const data = {
          name: "Ben Stewart",
          program: "Management Engineering",
          bio: "Looking for study partners for MSE courses.",
          courses: ["MSE 342"],
        };

        setDraft(data);
        setOriginal(data); // used to ensure Cancel keeps original value
      } catch (err) {
        console.error("Failed to load profile", err);
      }
    };

    fetchProfile();
  }, []);

  if (!draft) return null;

  const handleCancel = () => {
    // Discard edits by navigating away without saving.
    // Original stays unchanged because we never wrote anywhere.
    navigate("/profile");
  };

  const handleAddCourse = () => {
    const trimmed = newCourse.trim();
    if (!trimmed) return;

    // Simple duplicate prevention (case-sensitive). You can remove if you want.
    if (!draft.courses.includes(trimmed)) {
      setDraft({ ...draft, courses: [...draft.courses, trimmed] });
    }

    setNewCourse("");
  };

  const handleRemoveCourse = (courseToRemove) => {
    setDraft({
      ...draft,
      courses: draft.courses.filter((c) => c !== courseToRemove),
    });
  };

  const handleSave = async () => {
    // Validate display name acceptance criteria
    const err = validateDisplayName(draft.name);
    if (err) {
      setNameError(err);
      return;
    }

    // Trim leading/trailing spaces before saving
    const payload = { ...draft, name: draft.name.trim() };

    try {
      // 🔮 Future backend call
      // const res = await fetch("/api/profile", {
      //   method: "PUT",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(payload),
      // });
      // if (!res.ok) throw new Error("Failed to save profile");

      // If backend succeeds, show success notification
      setSuccessOpen(true);

      // Update local "original" snapshot (nice for future UX if you stay on page)
      setOriginal(payload);
      setDraft(payload);

      // Navigate back after a short delay so user can see the message
      setTimeout(() => {
        navigate("/profile");
      }, 1500);
    } catch (err2) {
      console.error("Failed to save profile", err2);
      // (Optional later) show error snackbar here
    }
  };

  return (
    <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
      <Card sx={{ width: 800 }}>
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Edit Profile
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Backend-ready setup: validation runs now; saving will call the API later.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Stack spacing={2}>
            {/* Display Name */}
            <TextField
              label="Display Name"
              value={draft.name}
              onChange={(e) => {
                setDraft({ ...draft, name: e.target.value });
                if (nameError) setNameError("");
              }}
              fullWidth
              error={!!nameError}
              helperText={nameError || "Only letters, numbers, and spaces. Max 30 characters."}
              inputProps={{
                maxLength: 30, // ✅ truncates at 30 to satisfy AC
                "data-testid": "display-name-input",
              }}
            />

            {/* Program (placeholder until dropdown/autocomplete) */}
            <TextField
              label="Program"
              value={draft.program}
              onChange={(e) => setDraft({ ...draft, program: e.target.value })}
              fullWidth
              inputProps={{ "data-testid": "program-input" }}
            />

            {/* Bio */}
            <TextField
              label="Bio"
              value={draft.bio}
              onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
              multiline
              minRows={3}
              fullWidth
              inputProps={{ "data-testid": "bio-input" }}
            />

            {/* Courses (placeholder until multi-select dropdown/autocomplete) */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Courses
              </Typography>

              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                {(draft.courses || []).map((course, idx) => (
                  <Chip
                    key={`${course}-${idx}`}
                    label={course}
                    onDelete={() => handleRemoveCourse(course)}
                  />
                ))}
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <TextField
                  label="Add course"
                  value={newCourse}
                  onChange={(e) => setNewCourse(e.target.value)}
                  fullWidth
                  inputProps={{ "data-testid": "add-course-input" }}
                />
                <Button variant="contained" onClick={handleAddCourse} data-testid="add-course-btn">
                  Add
                </Button>
              </Stack>
            </Box>

            {/* Actions */}
            <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1 }}>
              <Button variant="text" onClick={handleCancel} data-testid="cancel-btn">
                Cancel
              </Button>
              <Button variant="contained" onClick={handleSave} data-testid="save-btn">
                Save
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Success Snackbar */}
      <Snackbar
        open={successOpen}
        autoHideDuration={1500}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled">
          Profile successfully updated
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default EditProfile;