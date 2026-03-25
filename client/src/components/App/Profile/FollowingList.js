import React, { useContext, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { FirebaseContext } from "../../Firebase";

function FollowingList() {
  const navigate = useNavigate();
  const firebase = useContext(FirebaseContext);

  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [followLoadingByUserId, setFollowLoadingByUserId] = useState({});

  useEffect(() => {
    const fetchFollowing = async () => {
      try {
        setLoading(true);
        setLoadError("");

        const user = firebase?.auth?.currentUser;
        if (!user) {
          throw new Error("No authenticated user found.");
        }

        const token = await user.getIdToken();
        const res = await fetch("/api/profile/following", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch following list.");
        }

        const data = await res.json();
        setFollowing(Array.isArray(data.following) ? data.following : []);
      } catch (err) {
        console.error("Failed to load following list", err);
        setLoadError("Failed to load following list.");
      } finally {
        setLoading(false);
      }
    };

    if (firebase?.auth) {
      fetchFollowing();
    }
  }, [firebase]);

  const handleUnfollow = async (targetUserId) => {
    try {
      setFollowLoadingByUserId((prev) => ({ ...prev, [targetUserId]: true }));

      const user = firebase?.auth?.currentUser;
      if (!user) {
        throw new Error("No authenticated user found.");
      }

      const token = await user.getIdToken();
      const res = await fetch(`/api/profile/${targetUserId}/follow`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to unfollow user.");
      }

      setFollowing((prev) =>
        prev.filter((candidate) => Number(candidate.user_id) !== Number(targetUserId))
      );
    } catch (err) {
      console.error("Failed to unfollow user", err);
    } finally {
      setFollowLoadingByUserId((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  return (
    <Box
      sx={{
        p: 3,
        display: "flex",
        justifyContent: "center",
        bgcolor: "background.default",
      }}
    >
      <Card sx={{ width: 900 }}>
        <CardContent>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            sx={{ mb: 3 }}
          >
            <Box>
              <Typography variant="h1" sx={{ mb: 1 }}>
                Following
              </Typography>
              <Typography variant="body1" color="text.secondary">
                People you are currently following.
              </Typography>
            </Box>

            <Button variant="outlined" onClick={() => navigate("/profile")}>
              Back to Profile
            </Button>
          </Stack>

          {loading ? (
            <Typography variant="body1" color="text.secondary">
              Loading...
            </Typography>
          ) : loadError ? (
            <Alert severity="error" variant="outlined">
              {loadError}
            </Alert>
          ) : following.length === 0 ? (
            <Typography variant="body1" color="text.secondary">
              You are not following anyone yet.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {following.map((user) => (
                <Card key={user.user_id} variant="outlined">
                  <CardContent>
                    <Stack spacing={1.25}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        spacing={2}
                      >
                        <Typography variant="h2" sx={{ color: "text.primary", flex: 1 }}>
                          {user.display_name || user.email || "Unnamed User"}
                        </Typography>

                        <Chip
                          label={
                            followLoadingByUserId[user.user_id] ? "Working..." : "Following"
                          }
                          color="success"
                          clickable
                          onClick={() => handleUnfollow(user.user_id)}
                          disabled={!!followLoadingByUserId[user.user_id]}
                          data-testid={`following-list-chip-${user.user_id}`}
                          sx={{ fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
                        />
                      </Stack>

                      {user.role && (
                        <Typography variant="body1" color="text.secondary">
                          {user.role}
                        </Typography>
                      )}

                      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                        {user.program_name && (
                          <Chip
                            label={user.program_name}
                            color="primary"
                            sx={{ fontWeight: 600 }}
                          />
                        )}

                        {user.gender && user.gender !== "Prefer not to say" && (
                          <Chip
                            label={user.gender}
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        )}

                        {user.role === "Staff" && user.department && (
                          <Chip
                            label={user.department}
                            color="secondary"
                            sx={{ fontWeight: 600 }}
                          />
                        )}
                      </Stack>

                      {user.bio && (
                        <Typography variant="body1" color="text.secondary">
                          {user.bio}
                        </Typography>
                      )}

                      <Button
                        variant="text"
                        sx={{ alignSelf: "flex-start", px: 0 }}
                        onClick={() => navigate(`/users/${user.user_id}`)}
                      >
                        View Profile
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default FollowingList;
