import React from "react";
import { Box, Typography, Chip, Stack, Card, CardContent } from "@mui/material";

function Profile() {
  return (
    <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
      <Card sx={{ width: 800 }}>
        <CardContent>

          {/* Header */}
          <Stack direction="row" spacing={3} alignItems="center">
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Ben Stewart
              </Typography>

              <Chip 
                label="Management Engineering"
                sx={{ mt: 1 }}
                color="primary"
              />
            </Box>
          </Stack>

          {/* Bio */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Bio
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Looking for study partners for MSE courses and open to joining project teams.
            </Typography>
          </Box>

          {/* Course Tag */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Current Course
            </Typography>

            <Chip 
              label="MSE 342"
              sx={{ mt: 1 }}
              variant="outlined"
            />
          </Box>

        </CardContent>
      </Card>
    </Box>
  );
}

export default Profile;