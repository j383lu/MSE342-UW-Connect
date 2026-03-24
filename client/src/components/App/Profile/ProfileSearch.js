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

function ProfileSearch() {
  const navigate = useNavigate();
  const firebase = useContext(FirebaseContext);

  const [searchText, setSearchText] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

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
      const matchesSearch = !trimmedQuery || name.includes(trimmedQuery);
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
                Find students and staff by name, program, or gender.
              </Typography>
            </Box>

            <Button variant="contained" onClick={() => navigate("/profile")}>
              Back to Profile
            </Button>
          </Stack>

          <Stack spacing={2} sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Search by name"
              placeholder="Type a first or last name"
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
                      <Typography variant="h2" sx={{ color: "text.primary" }}>
                        {user.display_name || "Unnamed User"}
                      </Typography>

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