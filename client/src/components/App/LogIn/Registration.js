// Author: Lauren Jung (21072517)
// About: For Users to register an account for the University Socialization App

import * as React from 'react';
import { useState } from 'react';
import { Typography, Button, TextField, Box, Container, Link, Card, CardContent } from '@mui/material';


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
        
        // Max 40 character logic for names
        if ((name === 'firstname' || name === 'lastname') && value.length > 40) {
            return; 
        }

        setFormData({ ...formData, [name]: value });
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
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

    // To change whether or not the password is masked or not
    // const [showPassword, setShowPassword] = useState(false);
    // // Toggle Function
    // const handleClickShowPassword = () => {
    //     setShowPassword(!showPassword);
    // };

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
                                    inputProps={{ "data-testid": "firstname-input" }}
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
                                    inputProps={{ "data-testid": "lastname-input" }}
                                    value={formData.lastname}
                                    onChange={handleChange}
                                    error={!!errors.lastname}
                                    helperText={errors.lastname}
                                />
                                {/* Need to wait for a later sprint to do the authentication */}
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="email"
                                    label="Email"
                                    id="email"
                                    inputProps={{ "data-testid": "email-input" }}
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
                                    inputProps={{ "data-testid": "username-input" }}
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
                                    type="password"
                                    id="password"
                                    inputProps={{ "data-testid": "password-input" }}
                                    value={formData.password}
                                    onChange={handleChange}
                                    error={!!errors.password}
                                    helperText={errors.password}
                                />
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="confirmpassword"
                                    label="Confirm Password"
                                    type="password"
                                    id="confirmpassword"
                                    inputProps={{ "data-testid": "confirm-password-input" }}
                                    value={formData.confirmpassword}
                                    onChange={handleChange}
                                    error={!!errors.confirmpassword}
                                    helperText={errors.confirmpassword}
                                />
                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    sx={{ mt: 3, mb: 2 }}
                                    data-testid="signup-btn"
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