import React from "react";
import {AppBar, Toolbar, Typography, Button, Grid
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { withFirebase } from '../Firebase';

function Navbar({ firebase }) {

  const navigate = useNavigate();

  const handleLogout = () => {
    firebase.doSignOut()
      .then(() => {
        console.log("User signed out");
        navigate('/');
      })
      .catch(error => {
        console.error("Logout Error", error);
      });
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Grid container alignItems="center">
          <Grid item xs={6}>
            <Typography variant="h6">UW Connect</Typography>
          </Grid>

          <Grid item xs={6} container justifyContent="flex-end" spacing={2}>
            <Grid item>
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/feed"
                style={{ marginLeft: '10px', borderColor: 'white', color: 'white' }}
              >
                Home
              </Button>
            </Grid>
            <Grid item>
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/groups"
                style={{ marginLeft: '10px', borderColor: 'white', color: 'white' }}
              >
                Groups
              </Button>
            </Grid>
            <Grid item>
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/profile"
                style={{ marginLeft: '10px', borderColor: 'white', color: 'white' }}
              >
                Profile
              </Button>
            </Grid>
            <Grid item>
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/events"
                style={{ marginLeft: '10px', borderColor: 'white', color: 'white' }}
              >
                Events
              </Button>
            </Grid>
            <Grid item>
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/events"
                style={{ marginLeft: '10px', borderColor: 'white', color: 'white' }}
              >
                {/* Implement UI Bell Icon + notification badge */}
                Notifications
              </Button>
            </Grid>
            <Grid item>
              <Button 
                color="secondary" 
                variant="outlined" 
                onClick={handleLogout}
                style={{ marginLeft: '10px', borderColor: 'white', color: 'white' }}
              >
                Logout
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Toolbar>
    </AppBar>
  );
}

export default withFirebase(Navbar);