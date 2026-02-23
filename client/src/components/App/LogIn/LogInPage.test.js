// Author: Lauren Jung

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from './LogInPage';

describe('Login Component', () => {

    // Acceptance Criteria 1: Log in speed - must wait until a later sprint

    // Acceptance Criteria 2 & 3: Incorrect log in information/empty submission
    test('shows Required message for incorrect or empty fields', () => {
        render(<Login />);
        
        // Click without entering anything
        fireEvent.click(screen.getByTestId('login-btn'));
        
        const errorMessages = screen.getAllByText('This field is required.');
        expect(errorMessages.length).toBeGreaterThan(0);
        expect(screen.getByTestId('username-input').getAttribute('aria-invalid')).toBe('true');
    });

    // Acceptance Criteria 4: Masked password
    test('masks password characters by default', () => {
        render(<Login />);
        const passwordInput = screen.getByTestId('password-input');
        
        expect(passwordInput.type).toBe('password');
    });

    // Acceptance Criteria 7: Masked password toggle
    test('toggles password visibility when eye icon is clicked', () => {
        render(<Login />);
        const passwordInput = screen.getByTestId('password-input');
        const eyeIcon = screen.getByTestId('eye-icon');
        
        // Click eye icon
        fireEvent.click(eyeIcon);
        expect(passwordInput.type).toBe('text');
        
        // Click again to mask
        fireEvent.click(eyeIcon);
        expect(passwordInput.type).toBe('password');
    });

    // Acceptance Criteria 5: Account locking - Must wait until a later sprint
    // test('locks account after 5 failed attempts', () => {
    //     render(<Login />);
        
    //     // Simulate 6 failed attempts
    //     for (let i = 0; i < 6; i++) {
    //     fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'l2jung@uwaterloo.ca' } });
    //     fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'wrong-pass' } });
    //     fireEvent.click(screen.getByTestId('login-btn'));
    //     }
        
    //     expect(screen.getByTestId('lockout-message')).toHaveTextContent(/locked for 15 minutes/i);
    // });

    // Acceptance Criteria 6: Log in preservation - must wait until a later sprint
    // test('preserves login session on refresh', () => {
    //     render(<Login />);
        
    //     // Log in
    //     fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'l2jung@uwaterloo.ca' } });
    //     fireEvent.click(screen.getByTestId('login-btn'));
        
    //     // Verify the session (simulated)
    //     expect(screen.getByTestId('feed-header')).toBeInTheDocument();
    // });
});