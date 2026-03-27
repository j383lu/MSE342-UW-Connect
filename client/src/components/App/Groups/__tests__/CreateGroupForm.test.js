import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import CreateGroupForm from '../CreateGroupForm';
import { FirebaseContext } from '../../../Firebase';

// Mock URL methods
global.URL.createObjectURL = jest.fn();
global.URL.revokeObjectURL = jest.fn();

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Silence act warnings, React Router warnings, and other console noise
const originalConsole = { log: console.log, warn: console.warn, error: console.error };
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});
afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

global.fetch = jest.fn();

const mockTags = [
  { tag_id: 1, tag_name: 'Sports' }
];

const mockFirebase = {
  auth: {
    currentUser: {
      getIdToken: jest.fn().mockResolvedValue('test-token'),
    },
  },
};

function renderCreateGroupForm() {
  return render(
    <FirebaseContext.Provider value={mockFirebase}>
      <BrowserRouter>
        <CreateGroupForm />
      </BrowserRouter>
    </FirebaseContext.Provider>
  );
}

describe('CreateGroupForm', () => {
  beforeEach(() => {
    fetch.mockClear();
    mockNavigate.mockClear();
    mockFirebase.auth.currentUser.getIdToken.mockClear();
    // Use mockImplementation instead of mockResolvedValue
    fetch.mockImplementation(() => 
      Promise.resolve({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(mockTags)
      })
    );
  });

  test('renders form', async () => {
    renderCreateGroupForm();

    await waitFor(() => {
      expect(screen.getByText('Create New Group')).toBeInTheDocument();
    });
  });

  test('cancels and navigates back', async () => {
    renderCreateGroupForm();

    const cancelButton = await screen.findByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);
    expect(mockNavigate).toHaveBeenCalledWith('/groups');
  });
});