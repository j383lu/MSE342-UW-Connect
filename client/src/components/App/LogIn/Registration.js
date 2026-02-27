// Author: Lauren Jung (21072517)
// About: For Users to register an account for the University Socialization App

import * as React from 'react';
import { useState } from 'react';
import { Typography, Button, TextField, Box, Container, Link, Card, CardContent } from '@mui/material';
import { InputAdornment, IconButton } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';


const Registration = ({ onSwitchPage }) => { 

    const [formData, setFormData] = useState({
            firstname: '',
            lastname: '',
            email: '',
            username: '',
            password: '',
            confirmpassword: ''
        });

    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData({ ...formData, [name]: value });

        let errorMsg = '';
        
        // max 40 character logic for names
        if (name === 'firstname' || name === 'lastname') {
            const nameRegex = /^[a-zA-Z]*$/;
            if (!nameRegex.test(value)) {
                errorMsg = 'Only letters are allowed.';
            } else if (value.length > 40) {
                errorMsg = 'Name cannot exceed 40 characters.';
            }
        }

        if (name === 'username') {
            const usernameRegex = /^[a-zA-Z0-9_]*$/;
            if (!usernameRegex.test(value)) {
                errorMsg = 'Only letters, numbers, and underscores are allowed.';
            } else if (value.length > 30) {
                errorMsg = 'Username cannot exceed 30 characters.';
            }
        }   

        setErrors(prev => ({ ...prev, [name]: errorMsg }));
    };

    // to change whether or not the password is masked or not
    const [showPassword, setShowPassword] = useState(false);
    // Toggle Function
    const handleClickShowPassword = () => {
        setShowPassword(!showPassword);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        let newErrors = {};

        // Validation 1: All fields required
        Object.keys(formData).forEach((key) => {
            if (!formData[key]) {
                newErrors[key] = 'This field is required.' ;
            }
        });

        // Validation 2: Password Match
        if (formData.password && formData.confirmpassword) {
            if (formData.password !== formData.confirmpassword) {
                newErrors.confirmpassword = 'Passwords must match';
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
        } else {
            console.log('Form Submitted successfully', formData);
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
                py: 4, 
                backgroundColor: 'background.default'
            }}
        >
            <Container maxWidth="xs">
                <Card sx={{ width: '100%', p: 2}}>
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Box 
                            sx={{ 
                                marginTop: 4, 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                            }}
                        >
                            <Typography variant="h2" sx={{ fontSize: '1.75rem', mb: 1 }}>
                                Welcome to UW Connect
                            </Typography>
                            
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Please enter your information to sign up.
                            </Typography>

                            <Typography component="h1" variant="h5" color="text.secondary" sx={{ mb: 2 }}>
                                Register
                            </Typography>

                            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    id="firstname"
                                    label="First Name"
                                    name="firstname"
                                    autoFocus
                                    value={formData.firstname}
                                    onChange={handleChange}
                                    error={!!errors.firstname}
                                    helperText={errors.firstname}
                                />
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    id="lastname"
                                    label="Last Name"
                                    name="lastname"
                                    autoFocus
                                    value={formData.lastname}
                                    onChange={handleChange}
                                    error={!!errors.lastname}
                                    helperText={errors.lastname}
                                />
                                {/* need to wait for a later sprint to do the authentication */}
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="email"
                                    label="Email"
                                    id="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    error={!!errors.email}
                                    helperText={errors.email}
                                />
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="username"
                                    label="Username"
                                    id="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    error={!!errors.username}
                                    helperText={errors.username}
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
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="confirmpassword"
                                    label="Confirm Password"
                                    type={showPassword ? 'text' : 'password'}
                                    id="confirmpassword"
                                    value={formData.confirmpassword}
                                    onChange={handleChange}
                                    error={!!errors.confirmpassword}
                                    helperText={errors.confirmpassword}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    aria-label="toggle password visibility"
                                                    onClick={handleClickShowPassword}
                                                    edge="end"
                                                >
                                                    {/* Switch icon based on state */}
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
                                    Register
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
                    </CardContent>
                </Card>
            </Container>
        </Box>
    );
}

export default Registration;