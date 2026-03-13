import React, { useEffect, useMemo, useState } from "react";
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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";

function ProfileSearch() {
  const navigate = useNavigate();

  const [searchText, setSearchText] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const trimmedQuery = searchText.trim();
        const url = trimmedQuery
          ? `/api/profile/search-users?query=${encodeURIComponent(trimmedQuery)}`
          : `/api/profile/search-users`;

        const res = await fetch(url);

        if (!res.ok) {
          throw new Error("Failed to load users.");
        }

        const data = await res.json();

        if (Array.isArray(data)) {
          setUsers(data);
        } else {
          setUsers(Array.isArray(data.users) ? data.users : []);
        }
      } catch (err) {
        console.error("Failed to load users", err);
        setLoadError("Failed to load users.");
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    setLoadError("");
    fetchUsers();
  }, [searchText]);

  const displayedUsers = useMemo(() => {
    const trimmedQuery = searchText.trim().toLowerCase();

    if (!trimmedQuery) return users;

    return users.filter((user) => {
      const name = (user.display_name || user.name || "").toLowerCase();
      return name.includes(trimmedQuery);
    });
  }, [users, searchText]);

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
                Find students and staff by first or last name.
              </Typography>
            </Box>

            <Button variant="contained" onClick={() => navigate("/profile")}>
              Back to Profile
            </Button>
          </Stack>

          <TextField
            fullWidth
            label="Search by name"
            placeholder="Type a first or last name"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ mb: 3 }}
            inputProps={{ "data-testid": "user-search-input" }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

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
                <Card key={user.user_id || user.profile_id || user.id}>
                  <CardContent>
                    <Stack spacing={1}>
                      <Typography variant="h2" sx={{ color: "text.primary" }}>
                        {user.display_name || user.name || "Unnamed User"}
                      </Typography>

                      {user.role && (
                        <Typography variant="body1" color="text.secondary">
                          {user.role}
                        </Typography>
                      )}

                      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                        {(user.program_name || user.program) && (
                          <Chip
                            label={user.program_name || user.program}
                            color="primary"
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

export default ProfileSearch;