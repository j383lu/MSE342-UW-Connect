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
import s from './notificationStyles';

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
        <CircularProgress sx={{ color: '#17292B' }}/>
      </Box>
    );
  }

  return (
    <div style={s.pageBackground}>
      <div style={s.pageWrapper}>
        
        {/* HERO SECTION */}
        <div style={s.hero}>
          <div style={s.heroContent}>
            <div style={s.heroTextBlock}>
              <h1 style={s.heroTitle}>Notifications</h1>
              <p style={s.heroSubtitle}>Stay updated on your group activities</p>
            </div>
            {notifications.some(n => !n.is_read) && (
              <button style={s.heroPrimaryBtn} onClick={markAllRead}>
                Mark All as Read
              </button>
            )}
          </div>
        </div>

        {/* NOTIFICATION LIST */}
        <div style={s.panel}>
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <div 
                key={n.id} 
                style={{ 
                  ...s.notificationCard, 
                  ...(n.is_read ? {} : s.unreadCard) 
                }}
              >
                <div style={s.iconBox}>
                  {n.action_type === 'JOIN' ? 
                    <PersonAddIcon sx={{ color: '#5D6C5C' }} /> : 
                    <PersonRemoveIcon sx={{ color: '#C62828' }} />
                  }
                </div>
                
                <div style={{ flex: 1 }}>
                  <Typography style={{ 
                    ...s.messageText, 
                    fontWeight: n.is_read ? 500 : 700 
                  }}>
                    {n.message}
                  </Typography>
                  <span style={s.timeLabel}>
                    {new Date(n.created_at).toLocaleDateString()} at {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>

                <div style={s.statusPill}>
                  <span style={n.is_read ? s.statusEnded : s.statusOpen}>
                    {n.is_read ? 'Read' : 'New'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div style={s.emptyState}>
              <Typography style={s.emptyStateTitle}>All caught up!</Typography>
              <Typography style={s.emptyStateText}>No new notifications at the moment.</Typography>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Notifications;