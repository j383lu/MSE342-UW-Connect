import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Stack,
  Chip,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";

function ProgramStudents() {
  const navigate = useNavigate();
  const { programId } = useParams();

  const [students, setStudents] = useState([]);
  const [programName, setProgramName] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const fetchProgramStudents = async () => {
      try {
        const res = await fetch(`/api/profile/programs/${programId}/students`);

        if (!res.ok) {
          throw new Error("Failed to fetch students in this program.");
        }

        const data = await res.json();

        if (Array.isArray(data)) {
          setStudents(data);
          if (data.length > 0) {
            setProgramName(data[0].program_name || "");
          }
        } else {
          setStudents(Array.isArray(data.students) ? data.students : []);
          setProgramName(data.program_name || "");
        }
      } catch (err) {
        console.error("Failed to load program students", err);
        setLoadError("Failed to load students in this program.");
      } finally {
        setLoading(false);
      }
    };

    fetchProgramStudents();
  }, [programId]);

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
          justifyContent: "center",
          bgcolor: "background.default",
        }}
      >
        <Card sx={{ width: 900 }}>
          <CardContent>
            <Alert severity="error" variant="outlined">
              {loadError}
            </Alert>

            <Button
              variant="contained"
              sx={{ mt: 2 }}
              onClick={() => navigate("/profile")}
            >
              Back to Profile
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

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
                Program Students
              </Typography>

              <Typography variant="body1" color="text.secondary">
                {programName || "Students in this program"}
              </Typography>
            </Box>

            <Button variant="contained" onClick={() => navigate("/profile")}>
              Back to Profile
            </Button>
          </Stack>

          {students.length === 0 ? (
            <Typography variant="body1" color="text.secondary">
              No students found in this program.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {students.map((student) => (
                <Card key={student.user_id || student.profile_id || student.id}>
                  <CardContent>
                    <Stack spacing={1}>
                      <Typography variant="h2" sx={{ color: "text.primary" }}>
                        {student.display_name || student.name || "Unnamed User"}
                      </Typography>

                      {student.role && (
                        <Typography variant="body1" color="text.secondary">
                          {student.role}
                        </Typography>
                      )}

                      {(student.program_name || student.program) && (
                        <Chip
                          label={student.program_name || student.program}
                          color="primary"
                          sx={{ width: "fit-content", fontWeight: 600 }}
                        />
                      )}

                      {student.bio && (
                        <Typography variant="body1" color="text.secondary">
                          {student.bio}
                        </Typography>
                      )}

                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body1" sx={{ color: "text.primary", fontWeight: 600, mb: 1 }}>
                          Current Courses
                        </Typography>

                        {student.courses && student.courses.length > 0 ? (
                          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                            {student.courses.map((course) => (
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
                            No courses listed.
                          </Typography>
                        )}
                      </Box>
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

export default ProgramStudents;