// Author: Lauren Jung (21072517)
// About: For users that wish to log in to the University Socialization app
// they will be met with a log in page. Users will enter their user name and password
// to log in to the application. 
// If they do not have an account, they may log click the 'create an account' button
// which will redirect them to a registration page.

import * as React from 'react';
import { Typography, Button, TextField, Box, Container, Link, Card, CardContent } from '@mui/material';

const LogInPage = ({ onSwitchPage }) => { 

    return (
        <Box
            sx={{
                minHeight: '100vh', 
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center', 
                backgroundColor: 'background.default'
            }}
        >
            <Container maxWidth="xs">
                <Box 
                    sx={{ 
                        marginTop: 8, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center' 
                    }}
                >
                    <Card sx={{ width: '100%', p: 2}}>
                        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Typography variant="h2" sx={{ fontSize: '1.75rem', mb: 1 }}>
                                Welcome - UW Connect
                            </Typography>
                            
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Please enter your credentials to log in.
                            </Typography>

                            <Typography component="h1" variant="h5" color="text.secondary" sx={{ mb: 2 }}>
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
                        </CardContent>
                    </Card>
                </Box>
            </Container>
        </Box>
    );
}

export default LogInPage;