import * as React from 'react';
import { 
  Typography, Container, List, ListItem, ListItemText, ListItemIcon, Divider, Paper, Button, Box,Chip, CircularProgress
} from '@mui/material';
import { useEffect, useState, useCallback } from 'react';
import { useUser } from '../../../contexts/UserContext';
import PersonAddIcon from '@mui/icons-material/PersonAdd'; 
import PersonRemoveIcon from '@mui/icons-material/PersonRemove'; 
import CircleIcon from '@mui/icons-material/Circle'; 
import apiRequest from '../../../utils/api';

const Notifications = () => {
  const { dbUser } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // fetch  notifications from the Backend
  const fetchNotifications = useCallback(async () => {
    if (!dbUser?.userId) return;
    
    try {
      setLoading(true);
      const res = await apiRequest(`/api/notifications?userId=${dbUser.userId}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [dbUser?.userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      const res = await apiRequest('/api/notifications/read-all', {
        method: 'PUT'
      });
      if (res.ok) {
        // Optimistically update UI
        setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
      }
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" fontWeight="bold">Notifications</Typography>
        {notifications.length > 0 && (
          <Button variant="text" onClick={markAllRead}>Mark all as read</Button>
        )}
      </Box>

      <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <List sx={{ p: 0 }}>
          {notifications.length > 0 ? (
            notifications.map((notif, index) => (
              <React.Fragment key={notif.id}>
                <ListItem 
                  alignItems="flex-start"
                  sx={{ 
                    backgroundColor: notif.is_read ? 'transparent' : '#f0f7ff',
                    '&:hover': { backgroundColor: 'action.hover' }
                  }}
                >
                  <ListItemIcon sx={{ mt: 1 }}>
                    {notif.action_type === 'JOIN' ? (
                      <PersonAddIcon color="success" />
                    ) : (
                      <PersonRemoveIcon color="error" />
                    )}
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center">
                        <Typography variant="body1" fontWeight={notif.is_read ? 400 : 700}>
                          {notif.message}
                        </Typography>
                        {!notif.is_read && (
                          <CircleIcon sx={{ ml: 1, fontSize: 10, color: 'primary.main' }} />
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {new Date(notif.created_at).toLocaleString()}
                      </Typography>
                    }
                  />
                  
                  <Chip 
                    label={notif.entity_type} 
                    size="small" 
                    variant="outlined" 
                    sx={{ mt: 1, fontSize: '0.65rem' }}
                  />
                </ListItem>
                {index < notifications.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))
          ) : (
            <Box p={4} textAlign="center">
              <Typography color="text.secondary">You're all caught up!</Typography>
            </Box>
          )}
        </List>
      </Paper>
    </Container>
  );
};
export default Notifications;