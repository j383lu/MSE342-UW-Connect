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
import { useNavigate, useParams } from "react-router-dom";
import { FirebaseContext } from "../../Firebase";
import { useUser } from "../../../contexts/UserContext";
import ProfilePageStyle, {
  profileActionButtonSx,
  profileCardSx,
} from "./ProfilePageStyle";

function UserProfileView() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const firebase = useContext(FirebaseContext);
  const { dbUser } = useUser() || {};

  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSelfProfile, setIsSelfProfile] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followError, setFollowError] = useState("");

  useEffect(() => {
    const fetchProfileAndFollowState = async () => {
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

        const [profileRes, followStatusRes] = await Promise.all([
          fetch(`/api/profile/${userId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`/api/profile/${userId}/follow-status`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (!profileRes.ok) {
          const body = await profileRes.json().catch(() => ({}));
          if (profileRes.status === 404) {
            throw new Error("Profile not found.");
          }
          throw new Error(body?.error || "Failed to fetch profile.");
        }

        const profileData = await profileRes.json();
        setProfile(profileData);

        if (followStatusRes.ok) {
          const followData = await followStatusRes.json();
          setIsFollowing(!!followData?.isFollowing);
          setIsSelfProfile(!!followData?.isSelf);
        } else {
          setIsFollowing(false);
          setIsSelfProfile(Number(dbUser?.userId) === Number(userId));
        }
      } catch (err) {
        console.error("Failed to load profile", err);
        setLoadError(err.message || "Profile failed to load.");
      } finally {
        setLoading(false);
      }
    };

    if (firebase?.auth) {
      fetchProfileAndFollowState();
    }
  }, [dbUser?.userId, firebase, userId]);

  const handleFollow = async () => {
    try {
      setFollowLoading(true);
      setFollowError("");

      const user = firebase?.auth?.currentUser;
      if (!user) {
        throw new Error("No authenticated user found.");
      }

      const token = await user.getIdToken();
      const res = await fetch(`/api/profile/${userId}/follow`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to follow user.");
      }

      setIsFollowing(true);
    } catch (err) {
      console.error("Failed to follow user", err);
      setFollowError(err.message || "Failed to follow user.");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUnfollow = async () => {
    try {
      setFollowLoading(true);
      setFollowError("");

      const user = firebase?.auth?.currentUser;
      if (!user) {
        throw new Error("No authenticated user found.");
      }

      const token = await user.getIdToken();
      const res = await fetch(`/api/profile/${userId}/follow`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to unfollow user.");
      }

      setIsFollowing(false);
    } catch (err) {
      console.error("Failed to unfollow user", err);
      setFollowError(err.message || "Failed to unfollow user.");
    } finally {
      setFollowLoading(false);
    }
  };

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

  const pageTitle = profile?.name || "User Profile";
  const pageSubtitle = isSelfProfile
    ? "This is your public-facing profile in UW Connect."
    : "View shared profile details and follow this user.";

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
        <Button variant="contained" onClick={() => navigate("/profile-search")} sx={profileActionButtonSx}>
          Back to Profile Search
        </Button>
      </ProfilePageStyle>
    );
  }

  if (!profile) return null;

  const courses = profile.courses || [];

  return (
    <ProfilePageStyle
      title={pageTitle}
      subtitle={pageSubtitle}
      actions={[
        !isSelfProfile && (
          isFollowing ? (
            <Chip
              key="follow-state"
              label={followLoading ? "Working..." : "Following"}
              color="success"
              clickable
              onClick={handleUnfollow}
              disabled={followLoading}
              sx={{ fontWeight: 700, cursor: "pointer", minHeight: 42 }}
            />
          ) : (
            <Button
              key="follow"
              variant="contained"
              onClick={handleFollow}
              disabled={followLoading}
              sx={{
                ...profileActionButtonSx,
                backgroundColor: "#FDFDF6",
                color: "#17292B",
                "&:hover": { backgroundColor: "#f3f3ec" },
              }}
            >
              {followLoading ? "Following..." : "Follow"}
            </Button>
          )
        ),
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
          key="mine"
          variant="contained"
          onClick={() => navigate("/profile")}
          sx={{
            ...profileActionButtonSx,
            backgroundColor: "#FDFDF6",
            color: "#17292B",
            "&:hover": { backgroundColor: "#f3f3ec" },
          }}
        >
          My Profile
        </Button>,
      ].filter(Boolean)}
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
                      lineHeight: 1.2,
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

          {followError && (
            <Alert severity="error" variant="outlined" sx={{ mb: 2 }}>
              {followError}
            </Alert>
          )}

          <Box>
            <Typography variant="h2" sx={{ mb: 1 }}>
              Bio
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {profile.bio || "No bio added yet."}
            </Typography>
            <Typography variant="body1" sx={{ mt: 1, color: "text.secondary", fontWeight: 600 }}>
              Email: {profile.email || "Not added"}
            </Typography>
            {profile.phone_number && (
              <Typography variant="body1" sx={{ mt: 1, color: "text.secondary", fontWeight: 600 }}>
                Phone Number: {profile.phone_number}
              </Typography>
            )}
            {profile.birthday && (
              <Typography variant="body1" sx={{ mt: 1, color: "text.secondary", fontWeight: 600 }}>
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
                <Chip label={profile.department} color="primary" sx={{ fontWeight: 600 }} />
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
            {courses.length > 0 ? (
              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap", gap: 1 }}>
                {courses.map((course) => (
                  <Chip
                    key={course.course_id || course}
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
    </ProfilePageStyle>
  );
}

export default UserProfileView;
