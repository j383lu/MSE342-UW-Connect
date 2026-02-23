import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import Registration from './Registration'; 


describe('Signup Component', () => {

  // Acceptance Criteria 1: Happy path
  // test('shows success message with valid UWaterloo email', () => {
  //   render(<Signup />);
    
  //   fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'l2jung@uwaterloo.ca' } });
  //   fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'SecurePass123' } });
  //   fireEvent.click(screen.getByTestId('signup-btn'));
    
  //   expect(screen.getByTestId('status-message')).toHaveTextContent('Account Created');
  // });

  // Acceptance Criteria 2: Empty entries
  test('shows validation errors when fields are empty', () => {
    render(<Registration />);
    
    fireEvent.click(screen.getByTestId('signup-btn'));
    
    // Using the specific error text from your AC
    const errors = screen.getAllByText('This field is required.');
    expect(errors.length).toBeGreaterThan(0);
  });

  // Acceptance Criteria 3: Existing email
  // test('shows error when email already exists', () => {
  //   render(<Signup initialEmails={['l2jung@uwaterloo.ca']} />);
    
  //   fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'l2jung@uwaterloo.ca' } });
  //   fireEvent.click(screen.getByTestId('signup-btn'));
    
  //   expect(screen.getByTestId('error-display')).toHaveTextContent(/already registered/i);
  // });

  // Acceptance Criteria 4: 
//   test('marks account as unverified after successful signup', () => {
//     render(<Signup />);
    
//     fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'newstudent@uwaterloo.ca' } });
//     fireEvent.click(screen.getByTestId('signup-btn'));
    
//     expect(screen.getByTestId('verification-notice')).toBeInTheDocument();
//   });

    // Acceptance Criteria 5: Account verification (Must wait until later sprint)

    // Acceptance Criteria 6: Account verification (Must wait until later sprint)

    // Acceptance Criteria 7: User refresh
    // test('preserves user state after simulation of page leave', () => {
    //     render(<Signup />);
    
    //     fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'l2jung@uwaterloo.ca' } });
    //     fireEvent.click(screen.getByTestId('signup-btn'));
    
    //     // Simple check to see if the success state holds
    //     expect(screen.getByTestId('status-message')).toHaveTextContent('Account Created');
    // });
});