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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import s from '../Events/eventStyles';

const LogInPage = ({ onSwitchPage, onBack, firebase }) => { 

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
                background: 'linear-gradient(135deg, rgba(93,108,92,1) 0%, rgba(23,41,43,1) 100%)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100vh', 
                width: '100vw',
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            <div style={{ ...s.heroGlowOne, opacity: 0.4 }} />
            <div style={{ ...s.heroGlowTwo, opacity: 0.4 }} />

            <Container maxWidth="xs" sx={{ zIndex: 10 }}>
                <Button 
                    startIcon={<ArrowBackIcon />} 
                    onClick={onBack}
                    sx={{ 
                        color: 'rgba(255,255,255,0.7)', 
                        mb: 2, 
                        textTransform: 'none', 
                        '&:hover': { color: '#FDFDF6', background: 'rgba(255,255,255,0.05)' } 
                    }}
                >
                    Back to Welcome
                </Button>
                
                <Card sx={{ 
                    background: 'rgba(255, 255, 255, 0.07)', 
                    backdropFilter: 'blur(20px)', 
                    borderRadius: '24px', 
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.4)'
                }}>
                    <CardContent sx={{ p: 4 }}>
                        <Typography variant="h4" sx={{ color: '#FDFDF6', fontWeight: 750, mb: 1, textAlign: 'center', letterSpacing: '-0.02em' }}>
                            Welcome - UW Connect
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(253,253,246,0.7)', mb: 4, textAlign: 'center' }}>
                            Access your UW Connect account
                        </Typography>

                        <Box component="form" onSubmit={handleSubmit} noValidate>
                            {serverError && (
                                <Box sx={{ ...s.errorBanner, mb: 3, textAlign: 'center' }}>{serverError}</Box>
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
                                variant="outlined"
                                sx={inputStyles}
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
                                sx={inputStyles}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="toggle password visibility"
                                                onClick={handleClickShowPassword}
                                                edge="end"
                                                sx={{ color: 'rgba(255,255,255,0.5)' }}
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
                                sx={{ ...s.heroPrimaryBtn, mt: 4, mb: 2, height: 48 }}
                            >
                                Log In
                            </Button>
                            
                            <Box sx={{ textAlign: 'center', mt: 2 }}>
                                <Link 
                                    component="button" 
                                    variant="body2" 
                                    onClick={onSwitchPage}
                                    sx={{ color: 'rgba(253,253,246,0.8)', textDecoration: 'none', '&:hover': { color: '#FDFDF6' } }}
                                >
                                    {"Don't have an account? Create an account"}
                                </Link>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            </Container>
        </Box>
    );
}

const inputStyles = {
    '& .MuiOutlinedInput-root': {
        color: '#FDFDF6',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
        '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.4)' },
        '&.Mui-focused fieldset': { borderColor: '#FDFDF6' },
    },
    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.6)' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#FDFDF6' },
    '& .MuiFormHelperText-root': { color: '#ff8a80' } // Brighter red for errors on dark bg
};

export default withFirebase(LogInPage);