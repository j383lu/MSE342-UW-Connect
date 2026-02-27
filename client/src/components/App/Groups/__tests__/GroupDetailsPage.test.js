import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import GroupDetailsPage from '../GroupDetailsPage';

// Mock useParams
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ groupId: '1' }),
  useNavigate: () => jest.fn()
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

describe('GroupDetailsPage', () => {
  beforeEach(() => {
    fetch.mockClear();
    fetch.mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockGroup)
      })
    );
  });

  test('renders loading state', () => {
    render(
      <BrowserRouter>
        <GroupDetailsPage />
      </BrowserRouter>
    );
    expect(screen.getByText(/Loading group/i)).toBeInTheDocument();
  });

  test('displays group details after loading', async () => {
    render(
      <BrowserRouter>
        <GroupDetailsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Soccer Team')).toBeInTheDocument();
    });
  });
});