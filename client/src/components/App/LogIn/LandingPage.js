import React from 'react';
import { Typography, Button, Box, Container } from '@mui/material';
import s from '../Events/eventStyles';

const LandingPage = ({ onLoginClick, onRegisterClick }) => {
  return (
    <Box sx={fullScreenStyles.mainContainer}>
      <div style={s.heroGlowOne} />
      <div style={s.heroGlowTwo} />
      
      <div style={s.heroOverlay} />

      <Container maxWidth="md" sx={fullScreenStyles.contentWrapper}>
        <Box sx={{ textAlign: 'center', zIndex: 10, position: 'relative' }}>
          
          <Box sx={{ ...s.heroEyebrow, mb: 3 }}>
            <Typography variant="caption" fontWeight={700} sx={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              University of Waterloo
            </Typography>
          </Box>
          
          <h1 style={{ ...s.heroTitle, fontSize: '4.5rem', marginBottom: '24px' }}>
            UW Connect
          </h1>
          
          <Typography sx={{ ...s.heroSubtitle, fontSize: '1.25rem', mb: 6, opacity: 0.9 }}>
            The exclusive social hub for students and staff. 
            Find your crew, organize events, and build your community.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button 
              variant="contained" 
              onClick={onLoginClick}
              sx={{ 
                ...s.heroPrimaryBtn, 
                px: 6, 
                height: 56, 
                fontSize: '1.1rem',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 30px rgba(0,0,0,0.3)' }
              }}
            >
              Sign In
            </Button>
            <Button 
              variant="outlined" 
              onClick={onRegisterClick}
              sx={{ 
                ...s.heroSecondaryBtn, 
                px: 6, 
                height: 56, 
                fontSize: '1.1rem',
                '&:hover': { background: 'rgba(255,255,255,0.15)' }
              }}
            >
              Join Now
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

const fullScreenStyles = {
  mainContainer: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    // We take the gradient directly from your groupmate's hero style
    background: 'linear-gradient(135deg, rgba(93,108,92,1) 0%, rgba(23,41,43,1) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrapper: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  }
};

export default LandingPage;