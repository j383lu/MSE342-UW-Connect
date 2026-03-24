// Author: Lauren Jung

import * as React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../Theme';
import { useState } from 'react';
import LogInPage from './LogInPage';
import Registration from './Registration';
import LandingPage from './LandingPage';

const LogInAndRegister = () => {
  const [view, setView] = useState('landing');


  return (
    <ThemeProvider theme={theme}>
      {view === 'landing' && (
        <LandingPage 
          onLoginClick={() => setView('login')} 
          onRegisterClick={() => setView('register')} 
        />
      )}

      {view === 'login' && (
        <LogInPage 
          onSwitchPage={() => setView('register')} 
          onBack={() => setView('landing')}
        />
      )}

      {view === 'register' && (
        <Registration 
          onSwitchPage={() => setView('login')} 
          onBack={() => setView('landing')}
        />
      )}
    </ThemeProvider>
  );
}

export default LogInAndRegister;