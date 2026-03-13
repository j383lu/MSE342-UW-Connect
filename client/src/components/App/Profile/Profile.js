import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Chip,
  Stack,
  Card,
  CardContent,
  Button,
  Alert,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

function Profile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [userCourses, setUserCourses] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const [profileRes, coursesRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/profile/user-courses"),
        ]);

        if (!profileRes.ok) {
          throw new Error("Failed to fetch profile");
        }

        const profileData = await profileRes.json();
        setProfile(profileData);

        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();
          setUserCourses(coursesData || []);
        } else {
          console.error("Failed to load user courses");
        }
      } catch (err) {
        console.error("Failed to load profile", err);
        setLoadError("Profile failed to load.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  const formatBirthday = (birthday) => {
    if (!birthday) return "No birthday added yet.";

    const raw = String(birthday).slice(0, 10);
    const parts = raw.split("-");

    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${Number(month)}/${Number(day)}/${year}`;
    }

    return birthday;
  };

  if (loading) {
    return (
      <Box
        sx={{
          p: 3,
          display: "flex",
          justifyContent: "center",
          bgcolor: "background.default",
        }}
      >
        <Typography variant="body1" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box
        sx={{
          p: 3,
          display: "flex",
          justifyContent: "center",
          bgcolor: "background.default",
        }}
      >
        <Card sx={{ width: 800 }}>
          <CardContent>
            <Alert severity="error" variant="outlined">
              {loadError}
            </Alert>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (!profile) return null;

  return (
    <Box
      sx={{
        p: 3,
        display: "flex",
        justifyContent: "center",
        bgcolor: "background.default",
      }}
    >
      <Card sx={{ width: 800 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <Typography variant="h1" sx={{ mb: 1 }}>
                  {profile.name}
                </Typography>
              </Stack>

              {profile.gender && profile.gender !== "Prefer not to say" && (
                <Typography
                  variant="body1"
                  sx={{ color: "text.secondary", fontWeight: 600 }}
                >
                  {profile.gender}
                </Typography>
              )}

              {profile.role === "Staff" && (
                <Typography
                  variant="body1"
                  sx={{ color: "text.secondary", fontWeight: 600, mt: 1 }}
                >
                  Staff
                </Typography>
              )}
            </Box>

            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => navigate("/profile-search")}
              >
                Profile Search
              </Button>

              <Button
                variant="contained"
                onClick={() => navigate("/edit-profile")}
                data-testid="edit-profile-btn"
              >
                Edit Profile
              </Button>
            </Stack>
          </Stack>

          <Box sx={{ mt: 2 }}>
            <Typography variant="h2" sx={{ mb: 1 }}>
              Bio
            </Typography>

            <Typography variant="body1" color="text.secondary">
              {profile.bio || "No bio added yet."}
            </Typography>

            {profile.birthday && (
              <Typography
                variant="body1"
                sx={{ mt: 1, color: "text.secondary", fontWeight: 600 }}
              >
                Birthday: {formatBirthday(profile.birthday)}
              </Typography>
            )}

            {profile.phone_number && (
              <Typography
                variant="body1"
                sx={{ mt: 1, color: "text.secondary", fontWeight: 600 }}
              >
                Phone Number: {profile.phone_number}
              </Typography>
            )}
          </Box>

          {profile.role === "Staff" && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h2" sx={{ mb: 1 }}>
                Staff Department
              </Typography>
              {profile.department ? (
                <Chip
                  label={profile.department}
                  color="primary"
                  sx={{ fontWeight: 600 }}
                />
              ) : (
                <Typography variant="body1" color="text.secondary">
                  No department added yet.
                </Typography>
              )}
            </Box>
          )}

          <Box sx={{ mt: 4 }}>
            <Typography variant="h2" sx={{ mb: 1 }}>
              Program
            </Typography>
            {profile.program ? (
              <Chip
                label={profile.program}
                color="primary"
                clickable
                onClick={() => navigate(`/programs/${profile.program_id}/students`)}
                sx={{ fontWeight: 600, cursor: "pointer" }}
              />
            ) : (
              <Typography variant="body1" color="text.secondary">
                No program added yet.
              </Typography>
            )}
          </Box>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h2" sx={{ mb: 1 }}>
              Current Courses
            </Typography>

            {userCourses.length > 0 ? (
              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap", gap: 1 }}>
                {userCourses.map((course) => (
                  <Chip
                    key={course.course_id}
                    label={course.course_code}
                    color="primary"
                    sx={{ fontWeight: 600 }}
                  />
                ))}
              </Stack>
            ) : (
              <Typography variant="body1" color="text.secondary">
                No courses added yet.
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default Profile;