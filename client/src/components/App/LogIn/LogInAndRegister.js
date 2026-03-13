// Author: Lauren Jung

import * as React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../Theme';
import { useState } from 'react';
import LogInPage from './LogInPage';
import Registration from './Registration';

const LogInAndRegister = () => {

  // isLogin starts as true 
  const [isLogin, setIsLogin] = useState(true);
  // This function flips the boolean (true -> false / false -> true)
  const handlePageSwitch = () => {
      setIsLogin(!isLogin); 
      console.log("Page flipped! isLogin is now:", !isLogin);
  };

  // for when the user logs in/registers, they are redirected to the home page
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const handleLogIn = () => {
    setIsLoggedIn(!isLoggedIn)
  }

  return (
    <div>
      <ThemeProvider theme={theme}>
        {/* To flip between Log in and registration pages when signing in/up */}
        {isLogin ? (
          <LogInPage onSwitchPage={handlePageSwitch} onLogInPage={handleLogIn}/>
        ) : (
          <Registration onSwitchPage={handlePageSwitch} onLogInPage={handleLogIn}/>
        )}
      </ThemeProvider>
    </div>
  );
}

export default LogInAndRegister;