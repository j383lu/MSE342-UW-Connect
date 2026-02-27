import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Chip,
  Stack,
  Card,
  CardContent,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [userCourses, setUserCourses] = useState([]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();
        setProfile(data);
      } catch (err) {
        console.error("Failed to load profile", err);
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchUserCourses = async () => {
      try {
        const res = await fetch("/api/profile/user-courses");
        if (!res.ok) throw new Error("Failed to fetch user courses");
        const data = await res.json();
        setUserCourses(data || []);
      } catch (err) {
        console.error("Failed to load user courses", err);
      }
    };

    fetchUserCourses();
  }, []);

  if (!profile) return null;

  return (
    <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
      <Card sx={{ width: 800, bgcolor: "background.paper", borderColor: "divider" }}>
        <CardContent>
          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h2" sx={{ fontWeight: 600, color: "text.primary", mb: 1 }}>
                {profile.name}
              </Typography>

              <Chip 
                label={profile.program} 
                sx={{ mt: 1, bgcolor: "primary.main", color: "primary.contrastText", fontWeight: 600 }} 
              />
            </Box>

            <Button
              variant="contained"
              onClick={() => navigate("/edit-profile")}
              data-testid="edit-profile-btn"
              sx={{ bgcolor: "primary.main", color: "primary.contrastText", fontWeight: 600 }}
            >
              Edit Profile
            </Button>
          </Stack>

          {/* Bio */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h2" sx={{ fontWeight: 600, color: "text.primary", fontSize: "1rem", mb: 1 }}>
              Bio
            </Typography>
            <Typography variant="body1" sx={{ color: "text.secondary" }}>
              {profile.bio}
            </Typography>
          </Box>

          {/* Courses */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h2" sx={{ fontWeight: 600, color: "text.primary", fontSize: "1rem", mb: 1 }}>
              Current Courses
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
              {userCourses.map((course) => (
                <Chip 
                  key={course.course_id} 
                  label={`${course.course_code} - ${course.course_name}`}
                  variant="outlined"
                  sx={{ borderColor: "divider", color: "text.primary" }}
                />
              ))}
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default Profile;