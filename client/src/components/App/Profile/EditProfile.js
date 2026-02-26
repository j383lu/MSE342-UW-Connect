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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

function validateDisplayName(rawName) {
  const trimmed = rawName.trim();

  if (!trimmed) return "Name cannot be empty.";
  if (!/^[a-zA-Z0-9 ]+$/.test(trimmed))
    return "Only alphanumeric characters and spaces are allowed.";
  if (trimmed.length > 30)
    return "Name must be 30 characters or fewer.";

  return "";
}

function EditProfile() {
  const navigate = useNavigate();

  const [draft, setDraft] = useState(null);
  const [programOptions, setProgramOptions] = useState([]);
  const [newCourse, setNewCourse] = useState("");

  const [nameError, setNameError] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Load profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();

        setDraft({
          name: data.name || "",
          bio: data.bio || "",
          program_id: data.program_id ?? "",
          courses: Array.isArray(data.courses) ? data.courses : [],
        });
      } catch (err) {
        console.error(err);
        setSaveError("Could not load profile.");
      }
    };

    fetchProfile();
  }, []);

  // Load programs for dropdown
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const res = await fetch("/api/profile/programs");
        if (!res.ok) throw new Error("Failed to fetch programs");
        const data = await res.json();
        setProgramOptions(data);
      } catch (err) {
        console.error(err);
        setSaveError("Could not load programs.");
      }
    };

    fetchPrograms();
  }, []);

  if (!draft) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  const handleCancel = () => navigate("/profile");

  const handleAddCourse = () => {
    const trimmed = newCourse.trim();
    if (!trimmed) return;

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
    setSaveError("");

    const err = validateDisplayName(draft.name);
    if (err) {
      setNameError(err);
      return;
    }

    const payload = {
      name: draft.name.trim(),
      bio: draft.bio,
      program_id:
        draft.program_id === "" ? null : Number(draft.program_id),
    };

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = "Failed to save profile.";
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
        } catch (_) {}
        throw new Error(msg);
      }

      setSuccessOpen(true);
      setTimeout(() => navigate("/profile"), 1500);
    } catch (err2) {
      console.error(err2);
      setSaveError(err2.message || "Failed to save profile.");
    }
  };

  return (
    <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
      <Card sx={{ width: 800 }}>
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Edit Profile
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
              helperText={
                nameError ||
                "Only letters, numbers, and spaces. Max 30 characters."
              }
              inputProps={{
                maxLength: 30,
                "data-testid": "display-name-input",
              }}
            />

            {/* Program Dropdown */}
            <FormControl fullWidth>
              <InputLabel id="program-select-label">
                Program
              </InputLabel>
              <Select
                labelId="program-select-label"
                id="program-select"
                value={draft.program_id}
                label="Program"
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    program_id: e.target.value,
                  })
                }
                inputProps={{ "data-testid": "program-input" }}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {programOptions.map((program) => (
                  <MenuItem
                    key={program.program_id}
                    value={program.program_id}
                  >
                    {program.program_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Bio */}
            <TextField
              label="Bio"
              value={draft.bio}
              onChange={(e) =>
                setDraft({ ...draft, bio: e.target.value })
              }
              multiline
              minRows={3}
              fullWidth
              inputProps={{ "data-testid": "bio-input" }}
            />

            {/* Courses */}
            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600 }}
              >
                Courses
              </Typography>

              <Stack
                direction="row"
                spacing={1}
                sx={{ mt: 1, flexWrap: "wrap" }}
              >
                {(draft.courses || []).map((course, idx) => (
                  <Chip
                    key={`${course}-${idx}`}
                    label={course}
                    onDelete={() =>
                      handleRemoveCourse(course)
                    }
                  />
                ))}
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <TextField
                  label="Add course"
                  value={newCourse}
                  onChange={(e) =>
                    setNewCourse(e.target.value)
                  }
                  fullWidth
                />
                <Button
                  variant="contained"
                  onClick={handleAddCourse}
                >
                  Add
                </Button>
              </Stack>
            </Box>

            {saveError && (
              <Alert severity="error" variant="outlined">
                {saveError}
              </Alert>
            )}

            <Stack
              direction="row"
              justifyContent="flex-end"
              spacing={1}
            >
              <Button variant="text" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
              >
                Save
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Snackbar
        open={successOpen}
        autoHideDuration={1500}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <Alert severity="success" variant="filled">
          Profile successfully updated
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default EditProfile;