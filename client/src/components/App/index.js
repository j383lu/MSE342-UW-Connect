import * as React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import theme from './Theme'
import { useState } from 'react';
import LogInPage from './LogIn/LogInPage';
import Registration from './LogIn/Registration';


const App = () => {

  // isLogin starts as true 
  const [isLogin, setIsLogin] = useState(true);
  // This function flips the boolean (true -> false / false -> true)
  const handlePageSwitch = () => {
      setIsLogin(!isLogin); 
      console.log("Page flipped! isLogin is now:", !isLogin);
  };

  return (
    <div>
      <ThemeProvider theme={theme}>
        {/* To flip between Log in and registration pages when signing in/up */}
        {isLogin ? (
          <LogInPage onSwitchPage={handlePageSwitch} />
        ) : (
          <Registration onSwitchPage={handlePageSwitch} />
        )}
      </ThemeProvider>
    </div>
  );
}

export default App;
