// Author: Lauren Jung (21072517)
// About: For Users to register an account for the University Socialization App

import * as React from 'react';
import { Typography, Button, TextField, Box, Container, Link } from '@mui/material';

const Registration = ({ onSwitchPage }) => { 

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
                    Register
                </Typography>

                <Box component="form" noValidate sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="firstname"
                        label="First Name"
                        name="firstname"
                        autoFocus
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="lastname"
                        label="Last Name"
                        name="lastname"
                        autoFocus
                    />
                    {/* Need to wait for a later sprint to do the authentication */}
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="email"
                        label="Email"
                        id="email"
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="username"
                        label="Username"
                        id="username"
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
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="confirmpassword"
                        label="Confirm Password"
                        type="password"
                        id="confirmpassword"
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
                        {"Already have an account? Log in"}
                    </Link>
                </Box>
            </Box>
        </Container>
    );
}

export default Registration;