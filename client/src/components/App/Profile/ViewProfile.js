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
import { useNavigate, useParams } from "react-router-dom";

function ViewProfile() {
  const navigate = useNavigate();
  const { userId } = useParams();

  const [profile, setProfile] = useState(null);
  const [userCourses, setUserCourses] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchProfileData = async () => {
      try {
        const res = await fetch(`/api/profile/users/${userId}`);

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Profile not found");
          }
          throw new Error("Failed to fetch profile");
        }

        const profileData = await res.json();
        setProfile(profileData);
        setUserCourses(profileData.courses || []);
      } catch (err) {
        console.error("Failed to load profile", err);
        setLoadError(err.message || "Profile failed to load.");
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    setLoadError("");
    fetchProfileData();
  }, [userId]);

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
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
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
        <Button variant="outlined" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Box>
    );
  }

  if (!profile) return null;

  const courses = Array.isArray(profile.courses)
    ? profile.courses
    : userCourses;
  const courseChips = courses.every((c) => typeof c === "object" && c.course_code)
    ? courses
    : [];

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
                  {profile.name || "Unnamed User"}
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

            <Button variant="outlined" onClick={() => navigate(-1)}>
              Go Back
            </Button>
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
                sx={{ fontWeight: 600 }}
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
            {courseChips.length > 0 ? (
              <Stack
                direction="row"
                spacing={1}
                sx={{ mt: 1, flexWrap: "wrap", gap: 1 }}
              >
                {courseChips.map((course) => (
                  <Chip
                    key={course.course_id}
                    label={course.course_code}
                    color="primary"
                    sx={{ fontWeight: 600 }}
                  />
                ))}
              </Stack>
            ) : Array.isArray(courses) && courses.length > 0 ? (
              <Stack
                direction="row"
                spacing={1}
                sx={{ mt: 1, flexWrap: "wrap", gap: 1 }}
              >
                {courses.map((courseId, idx) => (
                  <Chip
                    key={idx}
                    label={String(courseId)}
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

export default ViewProfile;
