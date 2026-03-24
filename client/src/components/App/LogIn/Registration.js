// Author: Lauren Jung (21072517)
// About: For Users to register an account for the University Socialization App

import * as React from 'react';
import { useState } from 'react';
import { Typography, Button, MenuItem, TextField, Box, Container, Link, Card, CardContent, Grid } from '@mui/material';
import { InputAdornment, IconButton } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useNavigate } from 'react-router-dom';
import { withFirebase } from '../../Firebase';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import s from '../Events/eventStyles';


const Registration = ({ onSwitchPage, onBack, firebase }) => { 

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
            firstname: '',
            lastname: '',
            role: '',
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

    const handleSubmit = async(event) => {
        event.preventDefault();
        let newErrors = {};

        // validation 1: All fields required
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

        if (!formData.email) {
            newErrors.email = 'Email is required.';
        } else {
        // uwaterloo address restriction
        const emailLower = formData.email.toLowerCase();
        if (!emailLower.endsWith('@uwaterloo.ca')) {
            newErrors.email = 'Only @uwaterloo.ca addresses are allowed.';
        }
    }

        if (formData.password) {
        const password = formData.password;

            if (password.length < 8) {
                newErrors.password = 'Password doesn’t meet minimum character length.'; // AC 1
            } else if (password.length > 32) {
                newErrors.password = 'Password has exceeded the maximum character length'; // AC 2
            } else if (!/[A-Z]/.test(password)) {
                newErrors.password = 'Password must contain an uppercase'; // AC 3
            } else if (!/[a-z]/.test(password)) {
                newErrors.password = 'Password must contain a lowercase letter.'; // AC 4
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
        } else {
            try {
                // create user in Firebase
                const authUser = await firebase.doCreateUserWithEmailAndPassword(
                    formData.email, 
                    formData.password
                );
                const token = await authUser.user.getIdToken();
                
                const dataToSave = {
                    firstname: formData.firstname,
                    lastname: formData.lastname,
                    role: formData.role,
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    firebase_uid: authUser.user.uid
                };

                //if Firebase succeeds, save to your MySQL API
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify(dataToSave)
                });

                if (response.ok) {
                    console.log('Successfully registered in both Firebase and MySQL');
                    navigate('/feed'); 
                } else {
                    const errorData = await response.json();
                    setErrors({ email: errorData.error || 'Database registration failed.' });
                }

            } catch (error) {
                setErrors({ email: error.message });
            }
        }
    };

    return (
        <Box
            sx={{
                background: 'linear-gradient(135deg, rgba(93,108,92,1) 0%, rgba(23,41,43,1) 100%)',
                minHeight: '100vh', 
                display: 'flex',
                justifyContent: 'center', 
                alignItems: 'center', 
                py: 6, 
                position: 'relative',
                overflowY: 'auto'
            }}
        >
            <div style={{ ...s.heroGlowOne, opacity: 0.4 }} />
            <div style={{ ...s.heroGlowTwo, opacity: 0.4 }} />

            <Container maxWidth="sm" sx={{ zIndex: 10 }}>
                <Button 
                    startIcon={<ArrowBackIcon />} 
                    onClick={onBack}
                    sx={{ color: 'rgba(255,255,255,0.7)', mb: 2, textTransform: 'none', '&:hover': { color: '#FDFDF6' } }}
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
                        <Typography variant="h4" sx={{ color: '#FDFDF6', fontWeight: 750, mb: 1, textAlign: 'center' }}>
                            Join UW Connect
                        </Typography>
                        
                        <Typography variant="body2" sx={{ color: 'rgba(253,253,246,0.6)', mb: 3, textAlign: 'center' }}>
                            Please enter your information to sign up.
                        </Typography>

                        <Typography variant="body2" sx={{ color: 'rgba(253,253,246,0.6)', mb: 3, textAlign: 'center' }}>
                            Register
                        </Typography>

                        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        margin="dense"
                                        required
                                        fullWidth
                                        id="firstname"
                                        label="First Name"
                                        name="firstname"
                                        value={formData.firstname}
                                        onChange={handleChange}
                                        error={!!errors.firstname}
                                        helperText={errors.firstname}
                                        sx={inputStyles}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        margin="dense"
                                        required
                                        fullWidth
                                        id="lastname"
                                        label="Last Name"
                                        name="lastname"
                                        value={formData.lastname}
                                        onChange={handleChange}
                                        error={!!errors.lastname}
                                        helperText={errors.lastname}
                                        sx={inputStyles}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        margin="normal"
                                        required
                                        fullWidth
                                        id="role"
                                        select 
                                        label="I am a..."
                                        name="role"
                                        value={formData.role}
                                        onChange={handleChange}
                                        error={!!errors.role}
                                        sx={inputStyles}
                                        helperText={errors.role || "Please select your role at UW"}
                                    >
                                        <MenuItem value="Student">Student</MenuItem>
                                        <MenuItem value="Staff">Staff</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6}>
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
                                        sx={inputStyles}
                                    />
                                </Grid>
                                <Grid item xs={12}>
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
                                        sx={inputStyles}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        margin="normal"
                                        required
                                        fullWidth
                                        sx={inputStyles}
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
                                                        sx={{ color: 'rgba(255,255,255,0.5)' }}
                                                    >
                                                        {/* switch icon based on state */}
                                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                                    </IconButton>
                                                </InputAdornment>
                                            )
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        margin="normal"
                                        required
                                        fullWidth
                                        sx={inputStyles}
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
                                                        sx={{ color: 'rgba(255,255,255,0.5)' }}
                                                    >
                                                        {/* Switch icon based on state */}
                                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                                    </IconButton>
                                                </InputAdornment>
                                            )
                                        }}
                                    />
                                </Grid>
                            </Grid>
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                sx={{ ...s.heroPrimaryBtn, mt: 3, mb: 2, height: 50 }}
                            >
                                Create Account
                            </Button>
                            
                            <Box sx={{ textAlign: 'center', mt: 1 }}>
                                <Link 
                                    component="button" 
                                    variant="body2" 
                                    onClick={onSwitchPage}
                                    sx={{ color: 'rgba(253,253,246,0.7)', textDecoration: 'none', '&:hover': { color: '#FDFDF6' } }}
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
    '& .MuiFormHelperText-root': { color: '#ff8a80' },
    '& .MuiSelect-icon': { color: 'rgba(255, 255, 255, 0.5)' } // Fix for dropdown arrow
};

export { Registration }
export default withFirebase(Registration);