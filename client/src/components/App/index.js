import * as React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import theme from './Theme'
import LogInAndRegister from './LogIn/LogInAndRegister';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import Navbar from './Navbar';


const App = () => {

  return (
    <div>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <Navbar /> 
          
          {/* Note: Login/Registration is not set up to handle authentication because of lecture timing;
            therefore, we have chosen to render the logIn page using the NavBar for now. */}
          <Routes>
            <Route path="/login" element={<LogInAndRegister />} />
          </Routes>
        </ThemeProvider>
    </BrowserRouter>
    </div>
  );
}

export default App;
