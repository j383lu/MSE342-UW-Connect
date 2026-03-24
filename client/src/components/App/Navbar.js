import React, { useState, useEffect } from "react";
import {AppBar, Toolbar, Typography, Button, Grid, IconButton, Badge, Container, Box } from "@mui/material";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
import { withFirebase } from '../Firebase';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useUser } from '../../contexts/UserContext'; 
import apiRequest from '../../utils/api';

function Navbar({ firebase }) {

  const navigate = useNavigate();
  const location = useLocation();
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

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { label: "Home", path: "/feed" },
    { label: "Groups", path: "/groups" },
    { label: "Events", path: "/events" },
    { label: "Profile", path: "/profile" },
  ];

  return (
    <AppBar 
      position="sticky"
      elevation={0}
      sx={{ 
        backgroundColor: "rgba(255, 255, 255, 0.82)", 
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(214, 223, 226, 0.95)",
        py: 0.5
      }}>
      <Container maxWidth="lg">
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 0 } }}>
          <Grid container alignItems="center">
              <Typography 
                variant="h5"
                component={RouterLink} 
                to="/feed"
                sx={{ 
                  fontWeight: 800, 
                  textDecoration: 'none', 
                  color: "#17292B", 
                  letterSpacing: "-0.04em",
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                UW<span style={{ color: "#5D6C5C" }}>Connect</span>
              </Typography>
              <Box sx={{ flexGrow: 1 }} />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {navLinks.map((link) => (
                  <Button 
                    key={link.path}
                  component={RouterLink}
                  to={link.path}
                    sx={{
                      color: isActive(link.path) ? "#36513B" : "#686967",
                      backgroundColor: isActive(link.path) ? "rgba(93,108,92,0.12)" : "transparent",
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      textTransform: 'none',
                      borderRadius: 999,
                      px: 2,
                      mx: 0.5,
                      transition: "all 0.2s ease",
                      '&:hover': { 
                        backgroundColor: "rgba(93,108,92,0.08)",
                        color: "#17292B" 
                      },
                    }}
                  >
                    {link.label}
                  </Button>
                ))}
                {/* <Button 
                  color="inherit" 
                  component={RouterLink} 
                  to="/groups"
                  style={{ marginLeft: '10px', borderColor: 'white', color: 'white' }}
                >
                  Groups
                </Button>
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
              </Grid> */}
              <IconButton 
                color="inherit" 
                component={RouterLink} 
                to="/notifications"
                sx={{ 
                  ml: 1, 
                  color: isActive('/notifications') ? "#17292B" : "#686967",
                  '&:hover': { backgroundColor: "rgba(93,108,92,0.08)" }
                }}
              >
                <Badge variant="dot" color="error" invisible={unreadCount === 0}>
                  <NotificationsIcon />
                </Badge>
              </IconButton>
              <Button 
                color="secondary" 
                variant="contained" 
                onClick={handleLogout}
                sx={{ 
                  ml: 2, 
                  borderRadius: 999,
                  textTransform: 'none',
                  fontWeight: 700,
                  backgroundColor: "#17292B", // Deep dark teal
                  color: "#FDFDF6", // Off-white text
                  boxShadow: "0 8px 18px rgba(23,41,43,0.15)",
                  '&:hover': {
                    backgroundColor: "#2a3d3f",
                    boxShadow: "0 10px 22px rgba(23,41,43,0.25)",
                  }
                }}
              >
                Logout
              </Button>
              </Box>
            </Grid>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default withFirebase(Navbar);