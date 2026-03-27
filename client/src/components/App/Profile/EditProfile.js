import React, { useContext, useEffect, useState } from "react";
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
  Avatar,
  Dialog,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { FirebaseContext } from "../../Firebase";
import ProfilePageStyle, {
  profileActionButtonSx,
  profileCardSx,
} from "./ProfilePageStyle";

export function validateDisplayName(rawName) {
  const trimmed = rawName.trim();

  if (!trimmed) return "Name cannot be empty.";
  if (!/^[a-zA-Z0-9 ]+$/.test(trimmed)) {
    return "Only alphanumeric characters and spaces are allowed.";
  }
  if (trimmed.length > 30) {
    return "Name must be 30 characters or fewer.";
  }

  return "";
}

function EditProfile() {
  const navigate = useNavigate();
  const firebase = useContext(FirebaseContext);

  const [draft, setDraft] = useState(null);
  const [programOptions, setProgramOptions] = useState([]);
  const [courseOptions, setCourseOptions] = useState([]);

  const [nameError, setNameError] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteProfile = async () => {
    try {
      const user = firebase?.auth?.currentUser;
      if (!user) throw new Error("No authenticated user found.");
      
      const token = await user.getIdToken();

      // 1. Call your backend to delete the SQL data
      const res = await fetch("/api/profile", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete profile.");
      }

      await firebase.auth.signOut();

      localStorage.clear(); 

      navigate("/"); 

    } catch (err) {
      console.error("Delete error:", err);
      setSaveError(err.message);
      setDeleteDialogOpen(false);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setSaveError("");

        const user = firebase?.auth?.currentUser;
        if (!user) {
          throw new Error("No authenticated user found.");
        }

        const token = await user.getIdToken();

        const [profileRes, programsRes, coursesRes] = await Promise.all([
          fetch("/api/profile", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch("/api/profile/programs", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch("/api/profile/courses", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (!profileRes.ok) throw new Error("Failed to fetch profile");
        if (!programsRes.ok) throw new Error("Failed to fetch programs");
        if (!coursesRes.ok) throw new Error("Failed to fetch courses");

        const profileData = await profileRes.json();
        const programsData = await programsRes.json();
        const coursesData = await coursesRes.json();

        setDraft({
          name: profileData.name || "",
          bio: profileData.bio || "",
          avatar_url: profileData.avatar_url || null,
          gender: profileData.gender || "",
          birthday: profileData.birthday ? profileData.birthday.slice(0, 10) : "",
          phone_number: profileData.phone_number || "",
          program_id: profileData.program_id ?? "",
          courses: Array.isArray(profileData.courses) ? profileData.courses : [],
        });

        setProgramOptions(programsData || []);
        setCourseOptions(coursesData || []);
      } catch (err) {
        console.error(err);
        setSaveError("Could not load profile.");
      }
    };

    if (firebase?.auth) {
      fetchInitialData();
    }
  }, [firebase]);

  const handleCancel = () => navigate("/profile");

  const handleCoursesChange = (event) => {
    const value = event.target.value;
    setDraft({
      ...draft,
      courses: typeof value === "string" ? value.split(",") : value,
    });
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|jpg|png|gif)$/i.test(file.type)) {
      setSaveError("Please select a valid image file (JPEG, PNG, or GIF).");
      return;
    }
    try {
      const user = firebase?.auth?.currentUser;
      if (!user) throw new Error("No authenticated user found.");
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch("/api/profile/avatar", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to upload profile picture.");
      }
      const data = await res.json();
      setDraft({
        ...draft,
        avatar_url: data.avatar_url,
      });
      setSaveError("");
    } catch (err) {
      console.error(err);
      setSaveError(err.message || "Failed to upload profile picture.");
    }
    e.target.value = "";
  };

  const handleSave = async () => {
    setSaveError("");

    const err = validateDisplayName(draft.name);
    if (err) {
      setNameError(err);
      return;
    }

    if (!draft.program_id) {
      setSaveError("Please select a program.");
      return;
    }

    const payload = {
      name: draft.name.trim(),
      bio: draft.bio,
      gender: draft.gender,
      birthday: draft.birthday || null,
      phone_number: draft.phone_number.trim(),
      program_id: draft.program_id === "" ? null : Number(draft.program_id),
      courses: draft.courses || [],
    };

    try {
      const user = firebase?.auth?.currentUser;
      if (!user) {
        throw new Error("No authenticated user found.");
      }

      const token = await user.getIdToken();

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
    } catch (err) {
      console.error(err);
      setSaveError(err.message || "Failed to save profile.");
    }
  };

  return (
    <ProfilePageStyle
      title="Edit Profile"
      subtitle="Update how you show up across UW Connect, from your photo to your courses."
      actions={[
        <Button
          key="cancel"
          variant="outlined"
          onClick={handleCancel}
          sx={{
            ...profileActionButtonSx,
            color: "#FDFDF6",
            borderColor: "rgba(255,255,255,0.24)",
            backgroundColor: "rgba(255,255,255,0.08)",
          }}
        >
          Cancel
        </Button>,
        <Button
          key="save"
          variant="contained"
          onClick={draft ? handleSave : undefined}
          disabled={!draft}
          sx={{
            ...profileActionButtonSx,
            backgroundColor: "#FDFDF6",
            color: "#17292B",
            "&:hover": { backgroundColor: "#f3f3ec" },
          }}
        >
          Save Changes
        </Button>,
      ]}
    >
      {!draft ? (
        <Typography color="text.secondary">Loading...</Typography>
      ) : (
        <Card sx={{ ...profileCardSx, width: "100%", maxWidth: 880, mx: "auto" }}>
          <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
            <Typography variant="h2" sx={{ color: "text.primary" }}>
              Edit your details
            </Typography>

            <Divider sx={{ my: 3, borderColor: "divider" }} />

            <Stack spacing={2}>
              <Box>
                <Typography variant="h2" sx={{ fontSize: "1rem", color: "text.primary", mb: 2 }}>
                  Profile Picture
                </Typography>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar
                    src={draft.avatar_url ? `/uploads/${draft.avatar_url}` : undefined}
                    alt={draft.name}
                    sx={{
                      width: 88,
                      height: 88,
                      bgcolor: "primary.main",
                      fontSize: "2rem",
                    }}
                  >
                    {!draft.avatar_url && (draft.name?.[0]?.toUpperCase() ?? "?")}
                  </Avatar>
                  <Button variant="outlined" component="label" sx={profileActionButtonSx}>
                    Change Photo
                    <input
                      type="file"
                      hidden
                      accept="image/jpeg,image/jpg,image/png,image/gif"
                      onChange={handleAvatarChange}
                    />
                  </Button>
                </Stack>
              </Box>

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

              <FormControl fullWidth>
                <InputLabel id="program-select-label">Program</InputLabel>
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

              <FormControl fullWidth>
                <InputLabel id="gender-select-label">Gender</InputLabel>
                <Select
                  labelId="gender-select-label"
                  id="gender-select"
                  value={draft.gender}
                  label="Gender"
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      gender: e.target.value,
                    })
                  }
                  inputProps={{ "data-testid": "gender-input" }}
                >
                  <MenuItem value="She/Her">She/Her</MenuItem>
                  <MenuItem value="He/Him">He/Him</MenuItem>
                  <MenuItem value="They/Them">They/Them</MenuItem>
                  <MenuItem value="Prefer not to say">Prefer not to say</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Birthday"
                type="date"
                value={draft.birthday}
                onChange={(e) =>
                  setDraft({ ...draft, birthday: e.target.value })
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
                inputProps={{ "data-testid": "birthday-input" }}
              />

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

              <TextField
                label="Phone Number (Optional)"
                value={draft.phone_number}
                onChange={(e) =>
                  setDraft({ ...draft, phone_number: e.target.value })
                }
                fullWidth
                inputProps={{
                  maxLength: 20,
                  "data-testid": "phone-number-input",
                }}
              />

              <Box>
                <Typography variant="h2" sx={{ fontSize: "1rem", color: "text.primary" }}>
                  Courses
                </Typography>

                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel id="courses-select-label">Select Courses</InputLabel>
                  <Select
                    labelId="courses-select-label"
                    id="courses-select"
                    multiple
                    value={draft.courses || []}
                    label="Select Courses"
                    onChange={handleCoursesChange}
                    renderValue={(selected) => (
                      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 0.5 }}>
                        {selected.map((courseId) => {
                          const course = courseOptions.find(
                            (c) => Number(c.course_id) === Number(courseId)
                          );
                          return (
                            <Chip
                              key={courseId}
                              label={course ? course.course_code : courseId}
                              color="primary"
                              sx={{ fontWeight: 600 }}
                            />
                          );
                        })}
                      </Stack>
                    )}
                  >
                    {courseOptions.map((course) => (
                      <MenuItem key={course.course_id} value={course.course_id}>
                        {course.course_code}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ mt: 6, textAlign: "center" }}>
                <Divider sx={{ mb: 3, opacity: 0.1 }} />
                <Button 
                  color="error" 
                  onClick={() => setDeleteDialogOpen(true)}
                  sx={{
                    ...profileActionButtonSx,
                    backgroundColor: "#d32f2f", // Professional Red
                    color: "#FFFFFF",           // White text
                    "&:hover": {
                      backgroundColor: "#b71c1c", // Darker red on hover
                    },
                  }}
                >
                  Delete my UW Connect profile
                </Button>
              </Box>

              <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <Box sx={{ p: 3 }}>
                  <Typography variant="h5" gutterBottom>Delete Profile?</Typography>
                  <Typography variant="body1" sx={{ mb: 3 }}>
                    Are you sure you want to delete your UW Connect profile? This action is permanent and will remove all your course and group data.
                  </Typography>
                  <Stack direction="row" spacing={2} justifyContent="flex-end">
                    <Button 
                      onClick={() => setDeleteDialogOpen(false)}
                      sx={{ 
                        ...profileActionButtonSx,
                        borderRadius: "50px", 
                        textTransform: "none",
                        px: 3 
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="contained" 
                      color="error"
                      onClick={handleDeleteProfile}
                      sx={{ 
                        ...profileActionButtonSx,
                        borderRadius: "50px", 
                        textTransform: "none",
                        px: 3 
                      }}
                    >
                      Yes, Delete Everything
                    </Button>
                  </Stack>
                </Box>
              </Dialog>

              {saveError && (
                <Alert severity="error" variant="outlined">
                  {saveError}
                </Alert>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

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
    </ProfilePageStyle>
  );
}

export default EditProfile;
