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
  Divider,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { FirebaseContext } from "../../Firebase";
import ProfilePageStyle, {
  profileActionButtonSx,
  profileCardSx,
} from "./ProfilePageStyle";

function Profile() {
  const navigate = useNavigate();
  const firebase = useContext(FirebaseContext);

  const [profile, setProfile] = useState(null);
  const [userCourses, setUserCourses] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        setLoadError("");

        const user = firebase?.auth?.currentUser;
        if (!user) {
          throw new Error("No authenticated user found.");
        }

        const token = await user.getIdToken();

        const [profileRes, coursesRes, followingRes] = await Promise.all([
          fetch("/api/profile", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch("/api/profile/user-courses", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch("/api/profile/following", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (!profileRes.ok) {
          let msg = "Failed to fetch profile";
          try {
            const body = await profileRes.json();
            if (body?.error) msg = body.error;
          } catch (_) {}
          throw new Error(msg);
        }

        const profileData = await profileRes.json();
        setProfile(profileData);

        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();
          setUserCourses(coursesData || []);
        } else {
          console.error("Failed to load user courses");
          setUserCourses([]);
        }

        if (followingRes.ok) {
          const followingData = await followingRes.json();
          setFollowing(Array.isArray(followingData.following) ? followingData.following : []);
        } else {
          console.error("Failed to load following list");
          setFollowing([]);
        }
      } catch (err) {
        console.error("Failed to load profile", err);
        setLoadError("Profile failed to load.");
      } finally {
        setLoading(false);
      }
    };

    if (firebase?.auth) {
      fetchProfileData();
    }
  }, [firebase]);

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

  const pageTitle = "My Profile";
  const pageSubtitle =
    "Manage your personal details, academic info, and who you are connected with.";

  if (loading) {
    return (
      <ProfilePageStyle title={pageTitle} subtitle={pageSubtitle}>
        <Typography variant="body1" color="text.secondary">
          Loading...
        </Typography>
      </ProfilePageStyle>
    );
  }

  if (loadError) {
    return (
      <ProfilePageStyle title={pageTitle} subtitle={pageSubtitle}>
        <Card sx={{ ...profileCardSx, width: "100%", maxWidth: 880, mx: "auto" }}>
          <CardContent>
            <Alert severity="error" variant="outlined">
              {loadError}
            </Alert>
          </CardContent>
        </Card>
      </ProfilePageStyle>
    );
  }

  if (!profile) return null;

  return (
    <ProfilePageStyle
      title={pageTitle}
      subtitle={pageSubtitle}
      actions={[
        <Button
          key="following"
          variant="outlined"
          onClick={() => navigate("/profile/following")}
          data-testid="following-list-btn"
          sx={{
            ...profileActionButtonSx,
            color: "#FDFDF6",
            borderColor: "rgba(255,255,255,0.24)",
            backgroundColor: "rgba(255,255,255,0.08)",
          }}
        >
          Following ({following.length})
        </Button>,
        <Button
          key="search"
          variant="outlined"
          onClick={() => navigate("/profile-search")}
          sx={{
            ...profileActionButtonSx,
            color: "#FDFDF6",
            borderColor: "rgba(255,255,255,0.24)",
            backgroundColor: "rgba(255,255,255,0.08)",
          }}
        >
          Profile Search
        </Button>,
        <Button
          key="edit"
          variant="contained"
          onClick={() => navigate("/edit-profile")}
          data-testid="edit-profile-btn"
          sx={{
            ...profileActionButtonSx,
            backgroundColor: "#FDFDF6",
            color: "#17292B",
            "&:hover": {
              backgroundColor: "#f3f3ec",
            },
          }}
        >
          Edit Profile
        </Button>,
      ]}
    >
      <Card sx={{ ...profileCardSx, width: "100%", maxWidth: 880, mx: "auto" }}>
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "flex-start" }}
            spacing={2}
          >
            <Stack
              direction="row"
              spacing={2}
              alignItems="flex-start"
              sx={{ flex: 1, minWidth: 0 }}
            >
              <Avatar
                src={profile.avatar_url ? `/uploads/${profile.avatar_url}` : undefined}
                alt={profile.name}
                sx={{
                  width: 88,
                  height: 88,
                  flexShrink: 0,
                  bgcolor: "primary.main",
                  fontSize: "2rem",
                }}
              >
                {!profile.avatar_url && (profile.name?.[0]?.toUpperCase() ?? "?")}
              </Avatar>
              <Stack spacing={0.75} sx={{ minWidth: 0, pt: 0.25 }}>
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="h1"
                    sx={{
                      mb: 0,
                      lineHeight: 1.15,
                      wordBreak: "break-word",
                    }}
                  >
                    {profile.name}
                  </Typography>
                  {profile.role === "Staff" && (
                    <Chip
                      label="Staff"
                      size="small"
                      color="secondary"
                      sx={{ fontWeight: 600, height: 26 }}
                    />
                  )}
                </Box>
                {profile.gender && profile.gender !== "Prefer not to say" && (
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    {profile.gender}
                  </Typography>
                )}
              </Stack>
            </Stack>
          </Stack>

          <Divider sx={{ my: 2.5 }} />

          <Box>
            <Typography variant="h2" sx={{ mb: 1 }}>
              Bio
            </Typography>

            <Typography variant="body1" color="text.secondary">
              {profile.bio || "No bio added yet."}
            </Typography>

            <Typography
              variant="body1"
              sx={{ mt: 1, color: "text.secondary", fontWeight: 600 }}
            >
              Email: {profile.email || "Not added"}
            </Typography>

            {profile.phone_number && (
              <Typography
                variant="body1"
                sx={{ mt: 1, color: "text.secondary", fontWeight: 600 }}
              >
                Phone Number: {profile.phone_number}
              </Typography>
            )}

            {profile.birthday && (
              <Typography
                variant="body1"
                sx={{ mt: 1, color: "text.secondary", fontWeight: 600 }}
              >
                Birthday: {formatBirthday(profile.birthday)}
              </Typography>
            )}
          </Box>

          {profile.role === "Staff" && (
            <Box
              sx={{
                mt: 3,
                p: 2,
                borderRadius: 2,
                bgcolor: "action.hover",
                border: 1,
                borderColor: "divider",
              }}
            >
              <Typography variant="h2" sx={{ mb: 1, mt: 0 }}>
                Staff Department
              </Typography>
              {profile.department ? (
                <Chip
                  label={profile.department}
                  color="primary"
                  sx={{ fontWeight: 600 }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No department added yet.
                </Typography>
              )}
            </Box>
          )}

          <Box sx={{ mt: 3 }}>
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

          <Box sx={{ mt: 3 }}>
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
    </ProfilePageStyle>
  );
}

export default Profile;
