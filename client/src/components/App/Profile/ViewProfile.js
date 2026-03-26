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
import ProfilePageStyle, {
  profileActionButtonSx,
  profileCardSx,
} from "./ProfilePageStyle";

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
      <ProfilePageStyle title="User Profile" subtitle="Loading profile details.">
        <Typography variant="body1" color="text.secondary">
          Loading...
        </Typography>
      </ProfilePageStyle>
    );
  }

  if (loadError) {
    return (
      <ProfilePageStyle title="User Profile" subtitle="We could not load this profile.">
        <Alert severity="error" variant="outlined" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
        <Button variant="outlined" onClick={() => navigate(-1)} sx={profileActionButtonSx}>
          Go Back
        </Button>
      </ProfilePageStyle>
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
    <ProfilePageStyle
      title={profile.name || "Unnamed User"}
      subtitle="View shared profile details."
      actions={[
        <Button
          key="back"
          variant="contained"
          onClick={() => navigate(-1)}
          sx={{
            ...profileActionButtonSx,
            backgroundColor: "#FDFDF6",
            color: "#17292B",
            "&:hover": { backgroundColor: "#f3f3ec" },
          }}
        >
          Go Back
        </Button>,
      ]}
    >
      <Card sx={{ ...profileCardSx, width: "100%", maxWidth: 880, mx: "auto" }}>
        <CardContent>
          <Box>
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
    </ProfilePageStyle>
  );
}

export default ViewProfile;
