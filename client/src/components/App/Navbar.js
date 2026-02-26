import React from "react";
import {AppBar, Toolbar, Typography, Button, Grid } from "@mui/material";
import {Link} from "react-router-dom";

function Navbar() {
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
              <Button 
                color="inherit"
                component={Link}
                to='/feed'
                >
                Home
              </Button>
            </Grid>
            <Grid item>
              <Button color="inherit">
                Groups
              </Button>
            </Grid>
            <Grid item>
              <Button color="inherit">
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