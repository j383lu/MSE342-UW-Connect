import * as React from 'react';
import { 
  Typography, Box, CircularProgress, Tabs, Tab
} from '@mui/material';
import { useEffect, useState, useCallback } from 'react';
import { useUser } from '../../../contexts/UserContext';
import PersonAddIcon from '@mui/icons-material/PersonAdd'; 
import PersonRemoveIcon from '@mui/icons-material/PersonRemove'; 
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import apiRequest from '../../../utils/api';
import s from './notificationStyles';
import DoneAllIcon from 'mui/icons-material/DoneAll';

const Notifications = () => {
  const { dbUser } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const filteredNotifications = notifications.filter(n => {
    if (tabValue === 1) return n.is_read === 0; // New
    if (tabValue === 2) return n.is_read === 1; // Read
    return true; // All
  });

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

  const deleteNotification = async (id) => {
  try {
    const res = await apiRequest(`/api/notifications/${id}`, {
      method: 'DELETE'
    });
    
    if (res.ok) {
      // Remove from local state immediately
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  } catch (err) {
    console.error("Error deleting notification:", err);
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
        
        <div style={s.hero}>
          <div style={s.heroGlowOne} />
          <div style={s.heroGlowTwo} />
          <div style={s.heroOverlay} />
          
          <div style={s.heroContent}>
            <div style={s.heroTextBlock}>
              <div style={s.heroEyebrow}>UW Connect</div>
              <h1 style={s.heroTitle}>Notifications</h1>
              <p style={s.heroSubtitle}>Stay updated on your group activities</p>
            </div>
            {notifications.some(n => !n.is_read) && (
              <button 
                style={s.heroActionBtn} 
                onClick={markAllRead}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(255, 255, 255, 0.2)";
                  e.target.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "rgba(255, 255, 255, 0.12)";
                  e.target.style.transform = "translateY(0)";
                }}
              >
                <DoneAllIcon sx={{ fontSize: 18 }} />
                Mark All as Read
              </button>
            )}
          </div>
        </div>

        <div style={s.toggleContainer}>
          <button
            style={{
              ...s.toggleButton,
              ...(tabValue === 0 ? s.toggleButtonActive : {})
            }}
            onClick={() => setTabValue(0)}
          >
            All ({notifications.length})
          </button>
          
          <button
            style={{
              ...s.toggleButton,
              ...(tabValue === 1 ? s.toggleButtonActive : {})
            }}
            onClick={() => setTabValue(1)}
          >
            New ({notifications.filter(n => !n.is_read).length})
          </button>
          
          <button
            style={{
              ...s.toggleButton,
              ...(tabValue === 2 ? s.toggleButtonActive : {})
            }}
            onClick={() => setTabValue(2)}
          >
            Read ({notifications.filter(n => n.is_read).length})
          </button>
        </div>

        <div style={s.panel}>
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((n) => (
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

                <IconButton 
                  onClick={() => deleteNotification(n.id)}
                  sx={{ 
                    ml: 1, 
                    color: 'rgba(0,0,0,0.3)', 
                    '&:hover': { color: '#C62828' } 
                  }}
                  aria-label="delete notification"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
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