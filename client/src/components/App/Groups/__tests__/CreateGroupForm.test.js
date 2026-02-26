import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import CreateGroupForm from '../CreateGroupForm';

// Mock URL methods
global.URL.createObjectURL = jest.fn();
global.URL.revokeObjectURL = jest.fn();

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Silence act warnings
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (/Warning.*not wrapped in act/.test(args[0])) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

global.fetch = jest.fn();

const mockTags = [
  { tag_id: 1, tag_name: 'Sports' }
];

describe('CreateGroupForm', () => {
  beforeEach(() => {
    fetch.mockClear();
    mockNavigate.mockClear();
    // Use mockImplementation instead of mockResolvedValue
    fetch.mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockTags)
      })
    );
  });

  test('renders form', async () => {
    render(
      <BrowserRouter>
        <CreateGroupForm />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Create New Group')).toBeInTheDocument();
    });
  });

  test('cancels and navigates back', async () => {
    render(
      <BrowserRouter>
        <CreateGroupForm />
      </BrowserRouter>
    );

    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      cancelButton.click();
      expect(mockNavigate).toHaveBeenCalledWith('/groups');
    });
  });
});