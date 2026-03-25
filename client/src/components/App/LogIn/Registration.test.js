// Author: Lauren Jung
import React from 'react';
import 'whatwg-fetch';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { Registration } from './Registration'; 
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

const mockFirebase = {
  doCreateUserWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: { uid: '123' } }))
};

const renderWithProviders = (ui) => {
  return render(
    <BrowserRouter>
      {/* Pass your mock firebase as a prop since you use withFirebase */}
      <Registration firebase={mockFirebase} />
    </BrowserRouter>
  );
};

afterEach(() => {
  cleanup();
  jest.clearAllMocks(); // Clear call counts between tests
});

describe('Signup Component', () => {

  // Acceptance Criteria 1: Happy path
  test('successfully registers a user with a valid Waterloo email', async () => {
    // mock successful firebase creation
    mockFirebase.doCreateUserWithEmailAndPassword.mockResolvedValueOnce({
      user: { uid: 'test-uid-123' }
    });

    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));

    const { container } = renderWithProviders();

    // Use name selectors to ensure we hit the actual input fields and not labels/icons
    fireEvent.change(container.querySelector('input[name="firstname"]'), { target: { value: 'Lauren' } });
    fireEvent.change(container.querySelector('input[name="lastname"]'), { target: { value: 'Jung' } });
    fireEvent.change(container.querySelector('input[name="username"]'), { target: { value: 'ljung' } });
    fireEvent.change(container.querySelector('input[name="email"]'), { target: { value: 'lauren@uwaterloo.ca' } });
    fireEvent.change(container.querySelector('input[name="password"]'), { target: { value: 'ValidPass1!' } });
    fireEvent.change(container.querySelector('input[name="confirmpassword"]'), { target: { value: 'ValidPass1!' } });
    fireEvent.change(container.querySelector('input[name="role"]'), { target: { value: 'Student' } });

    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(mockFirebase.doCreateUserWithEmailAndPassword).toHaveBeenCalled();
    });
  });

  // Acceptance Criteria 2: Empty entries
  test('shows validation errors when fields are empty', async() => {
    renderWithProviders();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    
    const errorMessages = await screen.findAllByText(/This field is required./i);
    expect(errorMessages.length).toBeGreaterThan(0);
  });

  test('rejects non-uwaterloo email addresses', async () => {
    renderWithProviders();
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'lauren@gmail.com' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    const errorMsg = await screen.findByText(/Only @uwaterloo.ca addresses are allowed./i);
    expect(errorMsg).toBeInTheDocument();
  });

// Acceptance Criteria 3: Existing email
  test('shows error when email is already registered in Firebase', async () => {
    // mock firebase throwing the specific "email-already-in-use" error
    mockFirebase.doCreateUserWithEmailAndPassword.mockRejectedValueOnce(
        new Error('This email is already in use.')
    );

    const { container } = renderWithProviders();

    // MUST fill all fields to pass your "gatekeeper" validation loop
    fireEvent.change(container.querySelector('input[name="firstname"]'), { target: { value: 'Lauren' } });
    fireEvent.change(container.querySelector('input[name="lastname"]'), { target: { value: 'Jung' } });
    fireEvent.change(container.querySelector('input[name="username"]'), { target: { value: 'ljung' } });
    fireEvent.change(container.querySelector('input[name="email"]'), { target: { value: 'existing@uwaterloo.ca' } });
    fireEvent.change(container.querySelector('input[name="password"]'), { target: { value: 'ValidPass1!' } });
    fireEvent.change(container.querySelector('input[name="confirmpassword"]'), { target: { value: 'ValidPass1!' } });
    fireEvent.change(container.querySelector('input[name="role"]'), { target: { value: 'Student' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    // Now it will correctly find the text inside the error state
    expect(await screen.findByText(/email is already in use/i)).toBeInTheDocument();
  }); 

// Acceptance Criteria 7: User refresh - must wait for a later sprint


  // ADDED TESTS FOR STORY 10

  // Acceptacne Criteria 1 and 2
  test('password must be at least 8 characters', async () => {
    renderWithProviders();
    fireEvent.change(screen.getAllByLabelText(/Password/i)[0], { target: { value: 'Short1' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/Password doesn’t meet minimum character length./i)).toBeInTheDocument();
  });

  // Acceptance Criteria 3 and 4
  test('password must contain at least one uppercase letter', async () => {
    renderWithProviders();
    fireEvent.change(screen.getAllByLabelText(/Password/i)[0], { target: { value: 'alllowercase1!' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/Password must contain an uppercase/i)).toBeInTheDocument();
  });

  test('password must contain at least one lowercase letter', async () => {
    renderWithProviders();
    fireEvent.change(screen.getAllByLabelText(/Password/i)[0], { target: { value: 'ALLLOWERCASE1!' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/Password must contain a lowercase letter./i)).toBeInTheDocument();
  });

  // Acceptance Criteria 7: password and password confirmation must match
  test('password and confirmation must match', async () => {
    renderWithProviders();
    fireEvent.change(screen.getAllByLabelText(/Password/i)[0], { target: { value: 'ValidPass1!' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'DifferentPass2!' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/Passwords must match/i)).toBeInTheDocument();
  });

});