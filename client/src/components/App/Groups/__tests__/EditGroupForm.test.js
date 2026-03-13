import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import EditGroupForm from '../EditGroupForm';

// Mock URL methods
global.URL.createObjectURL = jest.fn();
global.URL.revokeObjectURL = jest.fn();

// Mock useParams and useNavigate
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ groupId: '1' }),
  useNavigate: () => jest.fn()
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

const mockGroup = {
  group_id: 1,
  name: 'Soccer Team',
  description: 'Weekly soccer games',
  category: 'Sports',
  creator_id: 1,
  member_count: 5,
  max_members: 20,
  is_private: 0,
  image_url: 'test-image.jpg'
};

describe('EditGroupForm', () => {
  beforeEach(() => {
    fetch.mockClear();
    fetch
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTags)
        })
      )
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockGroup)
        })
      );
  });

  test('renders loading state', () => {
    render(
      <BrowserRouter>
        <EditGroupForm />
      </BrowserRouter>
    );
    expect(screen.getByText(/Loading group/i)).toBeInTheDocument();
  });

  test('loads group data', async () => {
    render(
      <BrowserRouter>
        <EditGroupForm />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Soccer Team')).toBeInTheDocument();
    });
  });
});