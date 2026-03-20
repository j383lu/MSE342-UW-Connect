// Author: Lauren Jung (21072517)
// About: For users that wish to log in to the University Socialization app
// they will be met with a log in page. Users will enter their user name and password
// to log in to the application. 
// If they do not have an account, they may log click the 'create an account' button
// which will redirect them to a registration page.

import * as React from 'react';
import { Typography, Button, TextField, Box, Container, Link, Card, CardContent } from '@mui/material';
import { InputAdornment, IconButton } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { withFirebase } from '../../Firebase';

const LogInPage = ({ onSwitchPage, firebase }) => { 

    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState({}); 
    const [showPassword, setShowPassword] = useState(false);
    const [serverError, setServerError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'email') setEmail(value);
        if (name === 'password') setPassword(value);
        
        // clear errors as the user types
        if (error[name]) setError({ ...error, [name]: '' });
    };

    const handleClickShowPassword = () => {
        setShowPassword(!showPassword);
    };

    const handleSubmit = async(event) => {
        event.preventDefault();
        setServerError('');
        let newErrors = {};

        if (!email) newErrors.email = 'This field is required.';
        if (!password) newErrors.password = 'This field is required.';

        if (Object.keys(newErrors).length > 0) {
            setError(newErrors);
            return;
        }


        try {
            const authUser = await firebase.doSignInWithEmailAndPassword(email, password);
            console.log('Successfully logged in with Firebase');

            const token = await authUser.user.getIdToken();

            const res = await fetch(`/api/users/by-email?email=${encodeURIComponent(email)}`, {
                headers: { 'Authorization': token }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.userId) localStorage.setItem('currentUserId', data.userId);
                navigate('/feed');
            }
        } catch (error) {
            switch (error.code) {
            case 'auth/invalid-email':
                setServerError('The email address is poorly formatted.');
                break;
            case 'auth/user-not-found':
                setServerError('No user found with this email.');
                break;
            case 'auth/wrong-password':
                setServerError('Incorrect password. Please try again.');
                break;
            case 'auth/invalid-credential':
                setServerError('Invalid email or password.');
                break;
            default:
                setServerError('An unexpected error occurred. Please try again.');
            }
        }
    };

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
                        marginTop: 2, 
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

                            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                                {serverError && (
                                    <Typography 
                                        color="error" 
                                        variant="body2" 
                                        sx={{ 
                                            mb: 2, 
                                            textAlign: 'center', 
                                            backgroundColor: '#ffebee', // Light red background
                                            padding: '8px', 
                                            borderRadius: '4px' 
                                        }}
                                    >
                                        {serverError}
                                    </Typography>
                                )}
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    id="email"
                                    label="Email"
                                    name="email"
                                    autoFocus
                                    value={email}
                                    onChange={handleChange}
                                    error={!!error.email}
                                    helperText={error.email}
                                />
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="password"
                                    label="Password"
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    value={password}
                                    onChange={handleChange}
                                    error={!!error.password}
                                    helperText={error.password}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    aria-label="toggle password visibility"
                                                    onClick={handleClickShowPassword}
                                                    edge="end"
                                                >
                                                    {/* switch icon based on state */}
                                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        )
                                    }}
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

export default withFirebase(LogInPage);