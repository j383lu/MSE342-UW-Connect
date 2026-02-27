import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import GroupsPage from '../GroupsPage';

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

// Mock fetch globally
global.fetch = jest.fn();

const mockGroups = [
  {
    group_id: 1,
    name: 'Soccer Team',
    description: 'Weekly soccer games',
    category: 'Sports',
    creator_id: 1,
    member_count: 5,
    max_members: 20,
    is_private: 0,
    image_url: null
  }
];

const mockTags = [
  { tag_id: 1, tag_name: 'Sports' }
];

describe('GroupsPage', () => {
  beforeEach(() => {
    fetch.mockClear();
    fetch.mockImplementation((url) => {
      if (url === '/api/tags') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTags)
        });
      }
      if (url === '/api/groups') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockGroups)
        });
      }
      if (url === '/api/users/1/groups/member') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  test('renders loading state', () => {
    render(
      <BrowserRouter>
        <GroupsPage />
      </BrowserRouter>
    );
    expect(screen.getByText(/Loading groups/i)).toBeInTheDocument();
  });

  test('displays groups after loading', async () => {
    render(
      <BrowserRouter>
        <GroupsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Use getAllByText since "Soccer Team" appears twice
      const soccerTeams = screen.getAllByText('Soccer Team');
      expect(soccerTeams.length).toBe(2);
    });
  });
});