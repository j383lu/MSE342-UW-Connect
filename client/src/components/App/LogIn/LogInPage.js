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
import {withFirebase} from '../../Firebase';

const LogInPage = ({ onSwitchPage, firebase }) => { 

    const navigate = useNavigate();

    const [formData, setFormData] = React.useState({ email: '', password: '' });
    const [errors, setErrors] = React.useState({});
    const [serverError, setServerError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        // Clear error when user types
        if (errors[name]) setErrors({ ...errors, [name]: '' });
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        let newErrors = {};

        if (!formData.email) newErrors.email = 'This field is required.';
        if (!formData.password) newErrors.password = 'This field is required.';

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            firebase
                .doSignInWithEmailAndPassword(formData.email, formData.password)
                .then(() => {
                    console.log('Successfully logged in with Firebase');
                    navigate('/feed'); 
                })
                .catch(error => {
                    console.error("Firebase Login Error:", error.code, error.message);
                    setServerError(error.message);
                });
        }
    };

    // to change whether or not the password is masked or not
    const [showPassword, setShowPassword] = useState(false);
    // toggle Function
    const handleClickShowPassword = () => {
        setShowPassword(!showPassword);
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
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    id="email"
                                    label="Email"
                                    name="email"
                                    autoFocus
                                    value={formData.email}
                                    onChange={handleChange}
                                    error={!!errors.email}
                                    helperText={errors.email}
                                />
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="password"
                                    label="Password"
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    error={!!errors.password}
                                    helperText={errors.password}
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