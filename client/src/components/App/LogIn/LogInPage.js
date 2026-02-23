// Author: Lauren Jung (21072517)
// About: For users that wish to log in to the University Socialization app
// they will be met with a log in page. Users will enter their user name and password
// to log in to the application. 
// If they do not have an account, they may log click the 'create an account' button
// which will redirect them to a registration page.

import * as React from 'react';
import { Typography, Button, TextField, Box, Container, Link } from '@mui/material';

const LogInPage = ({ onSwitchPage }) => { 

    return (
       <Container maxWidth="xs">
            <Box 
                sx={{ 
                    marginTop: 8, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center' 
                }}
            >
                <Typography component="h1" variant="h5">
                    Sign In
                </Typography>

                <Box component="form" noValidate sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="username"
                        label="Username"
                        name="username"
                        autoFocus
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Password"
                        type="password"
                        id="password"
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                    >
                        Log In
                    </Button>

                    <Link 
                        component="button" 
                        variant="body2" 
                        onClick={onSwitchPage}
                    >
                        {"Don't have an account? Create an account"}
                    </Link>
                </Box>
            </Box>
        </Container>
    );
}

export default LogInPage;