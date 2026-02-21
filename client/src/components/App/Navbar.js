import React from "react";
import { useNavigate } from "react-router-dom";
import {AppBar, Toolbar, Typography, Button, Grid
} from "@mui/material";

function Navbar() {
  
  const navigate = useNavigate();

  return (
    <AppBar position="static">
      <Toolbar>
        <Grid container alignItems="center">
          
          <Grid item xs={6}>
            <Typography variant="h6">
              UW Connect
            </Typography>
          </Grid>

          {/* Right side - Navigation Buttons */}
          <Grid item xs={6} container justifyContent="flex-end" spacing={2}>
            <Grid item>
              <Button color="inherit">
                Home
              </Button>
            </Grid>
            <Grid item>
              <Button color="inherit">
                Groups
              </Button>
            </Grid>
            <Grid item>
              <Button color="inherit" onClick={() => navigate("/profile")}>
                Profile
              </Button>
            </Grid>
            <Grid item>
              <Button color="inherit">
                Events
              </Button>
            </Grid>
          </Grid>

        </Grid>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;