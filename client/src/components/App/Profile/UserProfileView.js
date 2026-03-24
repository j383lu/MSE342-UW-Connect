import React, { useContext, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Chip,
  Stack,
  Card,
  CardContent,
  Button,
  Alert,
  Avatar,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { FirebaseContext } from "../../Firebase";

function UserProfileView() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const firebase = useContext(FirebaseContext);

  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        setLoadError("Invalid user.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setLoadError("");

        const user = firebase?.auth?.currentUser;
        if (!user) {
          throw new Error("No authenticated user found.");
        }

        const token = await user.getIdToken();

        const res = await fetch(`/api/profile/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (res.status === 404) {
            throw new Error("Profile not found.");
          }
          throw new Error(body?.error || "Failed to fetch profile.");
        }

        const data = await res.json();
        setProfile(data);
      } catch (err) {
        console.error("Failed to load profile", err);
        setLoadError(err.message || "Profile failed to load.");
      } finally {
        setLoading(false);
      }
    };

    if (firebase?.auth) {
      fetchProfile();
    }
  }, [firebase, userId]);

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
      <Box sx={{ p: 3, display: "flex", justifyContent: "center", bgcolor: "background.default" }}>
        <Typography variant="body1" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box sx={{ p: 3, display: "flex", justifyContent: "center", bgcolor: "background.default" }}>
        <Card sx={{ width: 800 }}>
          <CardContent>
            <Alert severity="error" variant="outlined">
              {loadError}
            </Alert>
            <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate("/profile-search")}>
              Back to Profile Search
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (!profile) return null;

  const courses = profile.courses || [];

  return (
    <Box sx={{ p: 3, display: "flex", justifyContent: "center", bgcolor: "background.default" }}>
      <Card sx={{ width: 800 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Avatar
                src={profile.avatar_url ? `/uploads/${profile.avatar_url}` : undefined}
                alt={profile.name}
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: "primary.main",
                  fontSize: "2rem",
                }}
              >
                {!profile.avatar_url && (profile.name?.[0]?.toUpperCase() ?? "?")}
              </Avatar>
              <Box>
                <Typography variant="h1" sx={{ mb: 1 }}>
                  {profile.name}
                </Typography>
                {profile.gender && profile.gender !== "Prefer not to say" && (
                  <Typography variant="body1" sx={{ color: "text.secondary", fontWeight: 600 }}>
                    {profile.gender}
                  </Typography>
                )}
                {profile.role === "Staff" && (
                  <Typography variant="body1" sx={{ color: "text.secondary", fontWeight: 600, mt: 1 }}>
                    Staff
                  </Typography>
                )}
              </Box>
            </Box>

            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => navigate("/profile-search")}>
                Profile Search
              </Button>
              <Button variant="contained" onClick={() => navigate("/profile")}>
                My Profile
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
              <Typography variant="body1" sx={{ mt: 1, color: "text.secondary", fontWeight: 600 }}>
                Birthday: {formatBirthday(profile.birthday)}
              </Typography>
            )}
            {profile.phone_number && (
              <Typography variant="body1" sx={{ mt: 1, color: "text.secondary", fontWeight: 600 }}>
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
                <Chip label={profile.department} color="primary" sx={{ fontWeight: 600 }} />
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
            {courses.length > 0 ? (
              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap", gap: 1 }}>
                {courses.map((course) => (
                  <Chip
                    key={course.course_id}
                    label={course.course_code || course}
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

export default UserProfileView;
