import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Stack,
  TextField,
  Chip,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";
import { FirebaseContext } from "../../Firebase";
import { useUser } from "../../../contexts/UserContext";

function ProfileSearch() {
  const navigate = useNavigate();
  const firebase = useContext(FirebaseContext);
  const { dbUser } = useUser();

  const [searchText, setSearchText] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [followStateByUserId, setFollowStateByUserId] = useState({});
  const [followLoadingByUserId, setFollowLoadingByUserId] = useState({});

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const user = firebase?.auth?.currentUser;
        if (!user) {
          throw new Error("No authenticated user found.");
        }

        const token = await user.getIdToken();

        const trimmedQuery = searchText.trim();
        const url = trimmedQuery
          ? `/api/profile/search-users?query=${encodeURIComponent(trimmedQuery)}`
          : `/api/profile/search-users`;

        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to load users.");
        }

        const data = await res.json();
        setUsers(Array.isArray(data.users) ? data.users : []);
      } catch (err) {
        console.error("Failed to load users", err);
        setLoadError("Failed to load users.");
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    setLoadError("");
    if (firebase?.auth) {
      fetchUsers();
    }
  }, [firebase, searchText]);

  useEffect(() => {
    const fetchFollowStates = async () => {
      try {
        const user = firebase?.auth?.currentUser;
        if (!user || !Array.isArray(users) || users.length === 0) {
          setFollowStateByUserId({});
          return;
        }

        const token = await user.getIdToken();
        const otherUsers = users.filter(
          (candidate) => Number(candidate.user_id) !== Number(dbUser?.userId)
        );

        const results = await Promise.all(
          otherUsers.map(async (candidate) => {
            const res = await fetch(`/api/profile/${candidate.user_id}/follow-status`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (!res.ok) {
              return [candidate.user_id, { isFollowing: false, isSelf: false }];
            }

            const data = await res.json();
            return [candidate.user_id, {
              isFollowing: !!data?.isFollowing,
              isSelf: !!data?.isSelf,
            }];
          })
        );

        setFollowStateByUserId(Object.fromEntries(results));
      } catch (err) {
        console.error("Failed to load follow states", err);
      }
    };

    if (firebase?.auth) {
      fetchFollowStates();
    }
  }, [dbUser?.userId, firebase, users]);

  const handleFollowToggle = async (targetUserId, isCurrentlyFollowing) => {
    try {
      setFollowLoadingByUserId((prev) => ({ ...prev, [targetUserId]: true }));

      const user = firebase?.auth?.currentUser;
      if (!user) {
        throw new Error("No authenticated user found.");
      }

      const token = await user.getIdToken();
      const res = await fetch(`/api/profile/${targetUserId}/follow`, {
        method: isCurrentlyFollowing ? "DELETE" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(
          isCurrentlyFollowing ? "Failed to unfollow user." : "Failed to follow user."
        );
      }

      setFollowStateByUserId((prev) => ({
        ...prev,
        [targetUserId]: {
          ...(prev[targetUserId] || {}),
          isFollowing: !isCurrentlyFollowing,
          isSelf: false,
        },
      }));
    } catch (err) {
      console.error("Failed to toggle follow state", err);
    } finally {
      setFollowLoadingByUserId((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const programOptions = useMemo(() => {
    return [...new Set(
      users
        .map((user) => user.program_name || "")
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  }, [users]);

  const genderOptions = useMemo(() => {
    return [...new Set(
      users
        .map((user) => user.gender || "")
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  }, [users]);

  const displayedUsers = useMemo(() => {
    const trimmedQuery = searchText.trim().toLowerCase();

    return users.filter((user) => {
      const name = (user.display_name || "").toLowerCase();
      const email = (user.email || "").toLowerCase();
      const matchesSearch =
        !trimmedQuery ||
        name.includes(trimmedQuery) ||
        email.includes(trimmedQuery);
      const matchesProgram =
        !selectedProgram || (user.program_name || "") === selectedProgram;
      const matchesGender =
        !selectedGender || (user.gender || "") === selectedGender;

      return matchesSearch && matchesProgram && matchesGender;
    });
  }, [users, searchText, selectedProgram, selectedGender]);

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
                Search Users
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Find students and staff by name, email, program, or gender.
              </Typography>
            </Box>

            <Button variant="contained" onClick={() => navigate("/profile")}>
              Back to Profile
            </Button>
          </Stack>

          <Stack spacing={2} sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Search by name or email"
              placeholder="Name or email address"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              inputProps={{ "data-testid": "user-search-input" }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="program-filter-label">Program</InputLabel>
                <Select
                  labelId="program-filter-label"
                  value={selectedProgram}
                  label="Program"
                  onChange={(e) => setSelectedProgram(e.target.value)}
                >
                  <MenuItem value="">All Programs</MenuItem>
                  {programOptions.map((program) => (
                    <MenuItem key={program} value={program}>
                      {program}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="gender-filter-label">Gender</InputLabel>
                <Select
                  labelId="gender-filter-label"
                  value={selectedGender}
                  label="Gender"
                  onChange={(e) => setSelectedGender(e.target.value)}
                >
                  <MenuItem value="">All Genders</MenuItem>
                  {genderOptions.map((gender) => (
                    <MenuItem key={gender} value={gender}>
                      {gender}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Stack>

          {loading ? (
            <Typography variant="body1" color="text.secondary">
              Loading...
            </Typography>
          ) : loadError ? (
            <Alert severity="error" variant="outlined">
              {loadError}
            </Alert>
          ) : displayedUsers.length === 0 ? (
            <Typography variant="body1" color="text.secondary">
              No users found.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {displayedUsers.map((user) => (
                <Card key={user.user_id}>
                  <CardContent>
                    <Stack spacing={1}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        spacing={2}
                      >
                        <Typography variant="h2" sx={{ color: "text.primary", flex: 1 }}>
                          {user.display_name || "Unnamed User"}
                        </Typography>

                        {Number(user.user_id) !== Number(dbUser?.userId) && (
                          followStateByUserId[user.user_id]?.isFollowing ? (
                            <Chip
                              label="Following"
                              color="success"
                              clickable
                              onClick={() => handleFollowToggle(user.user_id, true)}
                              disabled={!!followLoadingByUserId[user.user_id]}
                              data-testid={`following-chip-${user.user_id}`}
                              sx={{ fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
                            />
                          ) : (
                            <Button
                              variant="contained"
                              onClick={() => handleFollowToggle(user.user_id, false)}
                              disabled={!!followLoadingByUserId[user.user_id]}
                              sx={{ flexShrink: 0 }}
                            >
                              {followLoadingByUserId[user.user_id] ? "Working..." : "Follow"}
                            </Button>
                          )
                        )}
                      </Stack>

                      {user.role && (
                        <Typography variant="body1" color="text.secondary">
                          {user.role}
                        </Typography>
                      )}

                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ flexWrap: "wrap", gap: 1 }}
                      >
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
                        onClick={() => {
                          if (!user?.user_id) {
                            console.error("Missing user_id:", user);
                            return;
                          }
                          navigate(`/users/${user.user_id}`);
                        }}
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

export default ProfileSearch;
