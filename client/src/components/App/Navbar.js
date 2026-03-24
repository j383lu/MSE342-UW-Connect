import React, { useState, useEffect } from "react";
import {AppBar, Toolbar, Typography, Button, Grid, IconButton, Badge } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { withFirebase } from '../Firebase';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useUser } from '../../contexts/UserContext'; 
import apiRequest from '../../utils/api';

function Navbar({ firebase }) {

  const navigate = useNavigate();
  const { dbUser } = useUser(); // Access the logged-in user
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!dbUser?.userId) return;

      try {
        const res = await apiRequest(`/api/notifications/unread-count?userId=${dbUser.userId}`);
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount);
        }
      } catch (err) {
        console.error("Error fetching unread count:", err);
      }
    };

    fetchUnreadCount();
  }, [dbUser]);

  const handleLogout = () => {
    firebase.doSignOut()
        .then(() => {
          navigate('/');
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
              <IconButton 
                color="inherit" 
                component={RouterLink} 
                to="/notifications"
                style={{ ml: 1 }}
              >
                <Badge variant="dot" color="error" invisible={unreadCount === 0}>
                  <NotificationsIcon style={{ color: 'white' }} />
                </Badge>
              </IconButton>
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